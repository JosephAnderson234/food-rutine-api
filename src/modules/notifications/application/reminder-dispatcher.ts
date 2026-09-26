import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DELIVERY_GRACE_MS } from '../domain/Reminder.js';
import {
  PUSH_SENDER,
  PUSH_SUBSCRIPTION_REPOSITORY,
  REMINDER_REPOSITORY,
} from '../notifications.tokens.js';
import type { PushSender } from '../ports/PushSender.js';
import type { PushSubscriptionRepository } from '../ports/PushSubscriptionRepository.js';
import type { ReminderRepository } from '../ports/ReminderRepository.js';

const BATCH = 200;

/** Cada 30 s envía los avisos cuya hora llegó (precisión ≤ 30 s). */
@Injectable()
export class ReminderDispatcher {
  private readonly logger = new Logger(ReminderDispatcher.name);
  private running = false;

  constructor(
    @Inject(REMINDER_REPOSITORY) private readonly reminders: ReminderRepository,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly subs: PushSubscriptionRepository,
    @Inject(PUSH_SENDER) private readonly sender: PushSender,
  ) {}

  @Interval(30_000)
  async onTick() {
    // Sin solapamiento si una vuelta tarda más que el intervalo.
    if (this.running) return;
    this.running = true;
    try {
      await this.tick(new Date());
    } catch (e) {
      this.logger.error(e);
    } finally {
      this.running = false;
    }
  }

  /** Una vuelta del despachador; devuelve cuántos avisos se entregaron. */
  async tick(now: Date): Promise<number> {
    const due = await this.reminders.due(
      now,
      new Date(now.getTime() - DELIVERY_GRACE_MS),
      BATCH,
    );
    if (due.length === 0) return 0;
    const subsByUser = await this.subs.forUsers([
      ...new Set(due.map((r) => r.userId)),
    ]);

    const handled: string[] = [];
    let delivered = 0;
    for (const r of due) {
      const targets = subsByUser.get(r.userId) ?? [];
      const results = await Promise.all(
        targets.map(async (sub) => {
          const result = await this.sender.send(sub, {
            title: r.title,
            body: r.body,
            url: r.url,
          });
          if (result === 'gone') await this.subs.removeGone(sub.endpoint);
          return result;
        }),
      );
      // Sin dispositivos suscritos no hay a quién avisar: se da por atendido.
      if (targets.length === 0 || results.some((x) => x !== 'failed'))
        handled.push(r.id);
      if (results.includes('sent')) delivered++;
    }
    await this.reminders.markSent(handled, now);
    return delivered;
  }
}
