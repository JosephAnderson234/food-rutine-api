import type { DueReminder, ReminderInput } from '../domain/Reminder.js';

export interface ReminderRepository {
  /** Deja el scope igual a la lista (ver `planReplacement`). */
  replaceScope(
    userId: string,
    scope: string,
    reminders: ReminderInput[],
  ): Promise<{ created: number; updated: number; removed: number }>;
  /** Pendientes con hora ya cumplida y no más viejos que `since`. */
  due(now: Date, since: Date, limit: number): Promise<DueReminder[]>;
  markSent(ids: string[], at: Date): Promise<void>;
}
