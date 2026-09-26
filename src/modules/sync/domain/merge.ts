/**
 * Reglas de conflicto de la sincronización. Sin dependencias de framework.
 *
 * - Por defecto gana el cambio más reciente según el reloj del dispositivo (LWW).
 * - Porciones: su estado solo avanza (congelada → descongelando → empacada → comida).
 *   El estado más avanzado nunca se pierde aunque llegue un cambio más nuevo y atrasado.
 */

/** Colecciones que el cliente puede sincronizar (tablas de IndexedDB del frontend). */
export const SYNC_COLLECTIONS = [
  'settings',
  'weeks',
  'portions',
  'checks',
  'inventory',
  'manualEvents',
  'shoppingChecks',
  'calendarCache',
  'todoSent',
  'ingredients',
  'components',
  'assemblies',
  'weekTemplates',
  'fixedCourses',
] as const;
export type SyncCollection = (typeof SYNC_COLLECTIONS)[number];

export interface DocState {
  /** null = borrado. */
  data: unknown;
  deleted: boolean;
  clientUpdatedAt: Date;
}

export interface IncomingChange {
  collection: SyncCollection;
  docId: string;
  data: unknown;
  clientUpdatedAt: Date;
}

const PORTION_RANK: Record<string, number> = {
  fridge: 0,
  frozen: 0,
  thawing: 1,
  packed: 2,
  eaten: 3,
  discarded: 3,
};

function portionState(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'state' in data) {
    const state = (data as { state: unknown }).state;
    return typeof state === 'string' ? state : undefined;
  }
  return undefined;
}

const rank = (data: unknown) => PORTION_RANK[portionState(data) ?? ''] ?? -1;

/** Devuelve el documento resultante, o null si lo guardado ya es lo correcto. */
export function merge(
  incoming: IncomingChange,
  current: DocState | null,
): DocState | null {
  const next: DocState = {
    data: incoming.data ?? null,
    deleted: incoming.data === null || incoming.data === undefined,
    clientUpdatedAt: incoming.clientUpdatedAt,
  };
  if (!current) return next;

  const newer =
    next.clientUpdatedAt.getTime() > current.clientUpdatedAt.getTime();

  if (incoming.collection === 'portions' && !next.deleted && !current.deleted) {
    const nextRank = rank(next.data);
    const currentRank = rank(current.data);
    if (newer) {
      // Lo más nuevo gana, pero sin retroceder el estado.
      return nextRank >= currentRank
        ? next
        : {
            ...next,
            data: {
              ...(next.data as object),
              state: portionState(current.data),
            },
          };
    }
    // Llega tarde: solo aporta si su estado está más avanzado.
    return nextRank > currentRank
      ? {
          ...current,
          data: { ...(current.data as object), state: portionState(next.data) },
        }
      : null;
  }

  return newer ? next : null;
}
