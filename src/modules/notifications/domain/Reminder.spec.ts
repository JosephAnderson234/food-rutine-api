import { describe, expect, it } from 'vitest';
import {
  planReplacement,
  type ReminderInput,
  type StoredReminder,
} from './Reminder.js';

const input = (key: string, iso: string, title = key): ReminderInput => ({
  key,
  title,
  body: '',
  url: '/hoy',
  fireAt: new Date(iso),
});
const stored = (
  r: ReminderInput,
  id: string,
  sent = false,
): StoredReminder => ({
  ...r,
  id,
  sentAt: sent ? new Date() : null,
});

describe('planReplacement', () => {
  it('primera vez crea todo; repetir no cambia nada', () => {
    const list = [
      input('thaw', '2026-09-30T02:00:00Z'),
      input('pack', '2026-09-30T15:15:00Z'),
    ];
    expect(planReplacement([], list).create).toHaveLength(2);
    const existing = list.map((r, i) => stored(r, `r${i}`));
    expect(planReplacement(existing, list)).toEqual({
      create: [],
      update: [],
      remove: [],
    });
  });

  it('si cambia la hora se vuelve a enviar; si cambia solo el texto, no', () => {
    const existing = [
      stored(input('thaw', '2026-09-30T02:00:00Z'), 'r1', true),
      stored(input('pack', '2026-09-30T15:15:00Z'), 'r2', true),
    ];
    const plan = planReplacement(existing, [
      input('thaw', '2026-09-30T03:00:00Z'),
      input('pack', '2026-09-30T15:15:00Z', 'Armar lonchera: taper #3'),
    ]);
    expect(plan.update.map((u) => [u.id, u.resend])).toEqual([
      ['r1', true],
      ['r2', false],
    ]);
  });

  it('lo que ya no está en la lista se borra', () => {
    const existing = [stored(input('thaw', '2026-09-30T02:00:00Z'), 'r1')];
    expect(planReplacement(existing, []).remove).toEqual(['r1']);
  });
});
