import { Inject, Injectable } from '@nestjs/common';
import { type IncomingChange, merge } from '../domain/merge.js';
import { openSecrets, sealSecrets } from '../domain/secrets.js';
import type { SecretCipher } from '../ports/SecretCipher.js';
import type { SyncRepository } from '../ports/SyncRepository.js';
import { SECRET_CIPHER, SYNC_REPOSITORY } from '../sync.tokens.js';
import type { ChangeDto } from './dto/sync.dto.js';

/** Los cursores y versiones viajan como string: JSON no representa BigInt. */
export interface PushResponse {
  applied: number;
  skipped: number;
  cursor: string;
}

export interface PullResponse {
  changes: {
    collection: string;
    docId: string;
    data: unknown;
    deleted: boolean;
    clientUpdatedAt: string;
    version: string;
  }[];
  cursor: string;
  hasMore: boolean;
}

/** Tolerancia para relojes adelantados: un cambio "del futuro" se trata como de ahora. */
const MAX_CLOCK_SKEW_MS = 5 * 60_000;

@Injectable()
export class SyncService {
  constructor(
    @Inject(SYNC_REPOSITORY) private readonly repo: SyncRepository,
    @Inject(SECRET_CIPHER) private readonly cipher: SecretCipher,
  ) {}

  async push(
    userId: string,
    changes: ChangeDto[],
    now = Date.now(),
  ): Promise<PushResponse> {
    const incoming: IncomingChange[] = changes.map((c) => {
      const t = Date.parse(c.clientUpdatedAt);
      return {
        collection: c.collection,
        docId: c.docId,
        // Los campos secretos (token de Todoist) se guardan cifrados.
        data: sealSecrets(c.collection, c.data ?? null, (v) =>
          this.cipher.seal(v),
        ),
        // Un dispositivo con el reloj adelantado no debe "ganar" para siempre.
        clientUpdatedAt: new Date(Math.min(t, now + MAX_CLOCK_SKEW_MS)),
      };
    });
    const r = await this.repo.apply(userId, incoming, merge);
    return {
      applied: r.applied,
      skipped: r.skipped,
      cursor: r.cursor.toString(),
    };
  }

  async pull(userId: string, since = 0n, limit = 500): Promise<PullResponse> {
    const rows = await this.repo.listSince(userId, since, limit + 1);
    const page = rows.slice(0, limit);
    return {
      changes: page.map((r) => ({
        collection: r.collection,
        docId: r.docId,
        data: openSecrets(r.collection, r.data, (v) => this.cipher.open(v)),
        deleted: r.deleted,
        clientUpdatedAt: r.clientUpdatedAt.toISOString(),
        version: r.version.toString(),
      })),
      cursor: (page.at(-1)?.version ?? since).toString(),
      hasMore: rows.length > limit,
    };
  }
}
