import type { DocState, IncomingChange } from '../domain/merge.js';

export interface SyncedDoc extends DocState {
  collection: string;
  docId: string;
  version: bigint;
}

export interface ApplyResult {
  applied: number;
  /** Cambios ignorados porque el servidor ya tenía algo más nuevo. */
  skipped: number;
  cursor: bigint;
}

export interface SyncRepository {
  /**
   * Aplica cambios de forma atómica: bloquea al usuario, lee lo guardado,
   * resuelve cada conflicto con `resolve` y asigna versiones nuevas a lo que cambió.
   */
  apply(
    userId: string,
    changes: IncomingChange[],
    resolve: (
      incoming: IncomingChange,
      current: DocState | null,
    ) => DocState | null,
  ): Promise<ApplyResult>;

  /** Cambios con versión mayor a `since`, en orden, hasta `limit`. */
  listSince(userId: string, since: bigint, limit: number): Promise<SyncedDoc[]>;
}
