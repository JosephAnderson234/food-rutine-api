import { describe, expect, it, vi } from 'vitest';
import type { DueReminder } from '../domain/Reminder.js';
import type { PushResult, PushSender } from '../ports/PushSender.js';
import type {
  PushSubscriptionRepository,
  WebPushSubscription,
} from '../ports/PushSubscriptionRepository.js';
import type { ReminderRepository } from '../ports/ReminderRepository.js';
import { ReminderDispatcher } from './reminder-dispatcher.js';

const sub = (endpoint: string): WebPushSubscription => ({
  endpoint,
  keys: { p256dh: 'k', auth: 'a' },
});

function setup(
  due: DueReminder[],
  subs: Record<string, WebPushSubscription[]>,
  result: PushResult,
) {
  const reminders: ReminderRepository = {
    replaceScope: vi.fn(),
    due: vi.fn(async () => due),
    markSent: vi.fn(async () => undefined),
  };
  const subsRepo: PushSubscriptionRepository = {
    save: vi.fn(),
    remove: vi.fn(),
    forUsers: vi.fn(async () => new Map(Object.entries(subs))),
    removeGone: vi.fn(async () => undefined),
  };
  const sender: PushSender = {
    publicKey: 'pk',
    send: vi.fn(async () => result),
  };
  return {
    reminders,
    subsRepo,
    sender,
    d: new ReminderDispatcher(reminders, subsRepo, sender),
  };
}

const reminder: DueReminder = {
  id: 'r1',
  userId: 'u1',
  title: 'Pasar taper #5',
  body: '',
  url: '/hoy',
};
const now = new Date('2026-09-30T02:00:10Z');

describe('ReminderDispatcher', () => {
  it('envía a todos los dispositivos y marca enviado', async () => {
    const { d, sender, reminders } = setup(
      [reminder],
      { u1: [sub('a'), sub('b')] },
      'sent',
    );
    expect(await d.tick(now)).toBe(1);
    expect(sender.send).toHaveBeenCalledTimes(2);
    expect(reminders.markSent).toHaveBeenCalledWith(['r1'], now);
  });

  it('busca solo avisos de los últimos 30 min', async () => {
    const { d, reminders } = setup([], {}, 'sent');
    await d.tick(now);
    expect(reminders.due).toHaveBeenCalledWith(
      now,
      new Date(now.getTime() - 30 * 60_000),
      200,
    );
  });

  it('borra suscripciones que ya no existen', async () => {
    const { d, subsRepo } = setup([reminder], { u1: [sub('vieja')] }, 'gone');
    await d.tick(now);
    expect(subsRepo.removeGone).toHaveBeenCalledWith('vieja');
  });

  it('si todos los envíos fallan, se reintenta en la próxima vuelta', async () => {
    const { d, reminders } = setup([reminder], { u1: [sub('a')] }, 'failed');
    await d.tick(now);
    expect(reminders.markSent).toHaveBeenCalledWith([], now);
  });
});
