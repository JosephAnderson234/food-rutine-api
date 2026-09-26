import { describe, expect, it } from 'vitest';
import { type DocState, type IncomingChange, merge } from '../domain/merge.js';
import type {
  ApplyResult,
  SyncedDoc,
  SyncRepository,
} from '../ports/SyncRepository.js';
import { SyncService } from './sync.service.js';

/** Repositorio en memoria con la misma semántica que el de Prisma. */
function memoryRepo(): SyncRepository & { docs: Map<string, SyncedDoc> } {
  const docs = new Map<string, SyncedDoc>();
  let seq = 0n;
  return {
    docs,
    async apply(_userId, changes, resolve): Promise<ApplyResult> {
      let applied = 0;
      let skipped = 0;
      for (const c of changes) {
        const key = `${c.collection}:${c.docId}`;
        const cur = docs.get(key) ?? null;
        const next = resolve(c, cur);
        if (!next) {
          skipped++;
          continue;
        }
        seq += 1n;
        applied++;
        docs.set(key, {
          ...next,
          collection: c.collection,
          docId: c.docId,
          version: seq,
        });
      }
      return { applied, skipped, cursor: seq };
    },
    async listSince(_userId, since, limit) {
      return [...docs.values()]
        .filter((d) => d.version > since)
        .sort((a, b) => Number(a.version - b.version))
        .slice(0, limit);
    },
  };
}

/** Cifrado de juguete: invierte el texto. */
const fakeCipher = {
  seal: (v: string) => v.split('').reverse().join(''),
  open: (v: string) => v.split('').reverse().join(''),
};

const change = (docId: string, data: unknown, iso: string) => ({
  collection: 'portions' as const,
  docId,
  data,
  clientUpdatedAt: iso,
});

describe('SyncService', () => {
  it('push → pull devuelve lo enviado con cursor', async () => {
    const svc = new SyncService(memoryRepo(), fakeCipher);
    const r = await svc.push('u', [
      change('p1', { state: 'fridge' }, '2026-09-27T10:00:00Z'),
    ]);
    expect(r).toEqual({ applied: 1, skipped: 0, cursor: '1' });
    const pulled = await svc.pull('u');
    expect(pulled.changes.map((c) => c.docId)).toEqual(['p1']);
    expect(pulled.cursor).toBe('1');
    expect((await svc.pull('u', 1n)).changes).toEqual([]);
  });

  it('pagina con hasMore', async () => {
    const svc = new SyncService(memoryRepo(), fakeCipher);
    await svc.push('u', [
      change('a', {}, '2026-09-27T10:00:00Z'),
      change('b', {}, '2026-09-27T10:00:00Z'),
      change('c', {}, '2026-09-27T10:00:00Z'),
    ]);
    const first = await svc.pull('u', 0n, 2);
    expect(first.hasMore).toBe(true);
    const rest = await svc.pull('u', BigInt(first.cursor), 2);
    expect(rest.changes.map((c) => c.docId)).toEqual(['c']);
    expect(rest.hasMore).toBe(false);
  });

  it('un reloj adelantado no gana para siempre', async () => {
    const repo = memoryRepo();
    const svc = new SyncService(repo, fakeCipher);
    const now = Date.parse('2026-09-27T10:00:00Z');
    await svc.push(
      'u',
      [change('p', { state: 'fridge' }, '2027-01-01T00:00:00Z')],
      now,
    );
    const stored = repo.docs.get('portions:p');
    expect(stored?.clientUpdatedAt.getTime()).toBe(now + 5 * 60_000);
  });

  it('usa las reglas del dominio (porciones no retroceden)', () => {
    const cur: DocState = {
      data: { state: 'eaten' },
      deleted: false,
      clientUpdatedAt: new Date(1),
    };
    const inc: IncomingChange = {
      collection: 'portions',
      docId: 'p',
      data: { state: 'thawing' },
      clientUpdatedAt: new Date(2),
    };
    expect(
      (merge(inc, cur)?.data as { state?: string } | undefined)?.state,
    ).toBe('eaten');
  });

  it('guarda el token de Todoist cifrado y lo entrega descifrado', async () => {
    const repo = memoryRepo();
    const svc = new SyncService(repo, fakeCipher);
    await svc.push('u', [
      {
        collection: 'settings',
        docId: 'default',
        data: { id: 'default', todoist: { token: 'tok_123' } },
        clientUpdatedAt: '2026-09-27T10:00:00Z',
      },
    ]);
    expect(
      JSON.stringify(repo.docs.get('settings:default')?.data),
    ).not.toContain('tok_123');
    const pulled = await svc.pull('u');
    expect(pulled.changes[0].data).toEqual({
      id: 'default',
      todoist: { token: 'tok_123' },
    });
  });
});
