/** Aviso tal como lo manda el cliente (calculado por su planificador). */
export interface ReminderInput {
  key: string;
  title: string;
  body: string;
  url: string;
  fireAt: Date;
}

export interface StoredReminder extends ReminderInput {
  id: string;
  sentAt: Date | null;
}

export interface DueReminder {
  id: string;
  userId: string;
  title: string;
  body: string;
  url: string;
}

export interface ReplacementPlan {
  create: ReminderInput[];
  /** `resend`: cambió la hora, así que vuelve a quedar pendiente. */
  update: { id: string; data: ReminderInput; resend: boolean }[];
  remove: string[];
}

/**
 * Reemplaza el grupo de avisos de un scope (p. ej. una semana) por la lista nueva.
 * Idempotente: reenviar la misma lista no cambia nada ni duplica avisos.
 */
export function planReplacement(
  existing: StoredReminder[],
  incoming: ReminderInput[],
): ReplacementPlan {
  const byKey = new Map(existing.map((r) => [r.key, r]));
  const wanted = new Set(incoming.map((r) => r.key));
  const plan: ReplacementPlan = { create: [], update: [], remove: [] };
  for (const r of incoming) {
    const cur = byKey.get(r.key);
    if (!cur) {
      plan.create.push(r);
      continue;
    }
    const moved = cur.fireAt.getTime() !== r.fireAt.getTime();
    if (
      moved ||
      cur.title !== r.title ||
      cur.body !== r.body ||
      cur.url !== r.url
    ) {
      plan.update.push({ id: cur.id, data: r, resend: moved });
    }
  }
  for (const r of existing) if (!wanted.has(r.key)) plan.remove.push(r.id);
  return plan;
}

/** Un aviso atrasado más de `graceMs` ya no se envía (p. ej. el servidor estuvo caído). */
export const DELIVERY_GRACE_MS = 30 * 60_000;
