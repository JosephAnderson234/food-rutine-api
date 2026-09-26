import { describe, expect, it } from 'vitest';
import { type DocState, merge } from './merge.js';

const stateOf = (r: DocState | null) =>
  (r?.data as { state?: string } | undefined)?.state;

const at = (iso: string) => new Date(iso);
const doc = (data: unknown, iso: string): DocState => ({
  data,
  deleted: data === null,
  clientUpdatedAt: at(iso),
});

describe('merge — por defecto gana lo más reciente', () => {
  it('documento nuevo: se guarda', () => {
    const r = merge(
      {
        collection: 'settings',
        docId: 'default',
        data: { a: 1 },
        clientUpdatedAt: at('2026-09-27T10:00:00Z'),
      },
      null,
    );
    expect(r).toEqual(doc({ a: 1 }, '2026-09-27T10:00:00Z'));
  });

  it('un cambio más viejo no pisa uno más nuevo', () => {
    const r = merge(
      {
        collection: 'settings',
        docId: 'default',
        data: { a: 1 },
        clientUpdatedAt: at('2026-09-27T09:00:00Z'),
      },
      doc({ a: 2 }, '2026-09-27T10:00:00Z'),
    );
    expect(r).toBeNull();
  });

  it('borrar gana si es más reciente', () => {
    const r = merge(
      {
        collection: 'checks',
        docId: 'x',
        data: null,
        clientUpdatedAt: at('2026-09-27T11:00:00Z'),
      },
      doc({ on: true }, '2026-09-27T10:00:00Z'),
    );
    expect(r?.deleted).toBe(true);
  });
});

describe('merge — porciones nunca retroceden', () => {
  const portion = (state: string) => ({ id: 'p', label: 'Pollo', state });

  it('más nuevo y más avanzado: gana entero', () => {
    const r = merge(
      {
        collection: 'portions',
        docId: 'p',
        data: portion('eaten'),
        clientUpdatedAt: at('2026-09-28T13:00:00Z'),
      },
      doc(portion('packed'), '2026-09-28T08:00:00Z'),
    );
    expect(stateOf(r)).toBe('eaten');
  });

  it('más nuevo pero atrasado: toma sus datos y conserva el estado avanzado', () => {
    const r = merge(
      {
        collection: 'portions',
        docId: 'p',
        data: { ...portion('thawing'), label: 'Pollo (editado)' },
        clientUpdatedAt: at('2026-09-28T14:00:00Z'),
      },
      doc(portion('eaten'), '2026-09-28T13:00:00Z'),
    );
    expect(r?.data).toEqual({
      id: 'p',
      label: 'Pollo (editado)',
      state: 'eaten',
    });
  });

  it('llega tarde pero más avanzado: sube el estado', () => {
    const r = merge(
      {
        collection: 'portions',
        docId: 'p',
        data: portion('packed'),
        clientUpdatedAt: at('2026-09-28T08:00:00Z'),
      },
      doc(portion('thawing'), '2026-09-28T09:00:00Z'),
    );
    expect(stateOf(r)).toBe('packed');
    expect(r?.clientUpdatedAt).toEqual(at('2026-09-28T09:00:00Z'));
  });

  it('llega tarde y atrasado: no cambia nada', () => {
    const r = merge(
      {
        collection: 'portions',
        docId: 'p',
        data: portion('frozen'),
        clientUpdatedAt: at('2026-09-28T08:00:00Z'),
      },
      doc(portion('thawing'), '2026-09-28T09:00:00Z'),
    );
    expect(r).toBeNull();
  });
});
