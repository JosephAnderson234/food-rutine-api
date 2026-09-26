import { Inject, Injectable } from '@nestjs/common';
import {
  PUSH_SENDER,
  PUSH_SUBSCRIPTION_REPOSITORY,
  REMINDER_REPOSITORY,
} from '../notifications.tokens.js';
import type { PushSender } from '../ports/PushSender.js';
import type {
  PushSubscriptionRepository,
  WebPushSubscription,
} from '../ports/PushSubscriptionRepository.js';
import type { ReminderRepository } from '../ports/ReminderRepository.js';
import type { ReminderDto } from './dto/notifications.dto.js';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(REMINDER_REPOSITORY) private readonly reminders: ReminderRepository,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly subs: PushSubscriptionRepository,
    @Inject(PUSH_SENDER) private readonly sender: PushSender,
  ) {}

  publicKey(): { publicKey: string } {
    return { publicKey: this.sender.publicKey };
  }

  subscribe(userId: string, sub: WebPushSubscription) {
    return this.subs.save(userId, sub);
  }

  unsubscribe(userId: string, endpoint: string) {
    return this.subs.remove(userId, endpoint);
  }

  /** El cliente calcula sus avisos (planificador local) y reemplaza el grupo completo. */
  replace(userId: string, scope: string, reminders: ReminderDto[]) {
    return this.reminders.replaceScope(
      userId,
      scope,
      reminders.map((r) => ({
        key: r.key,
        title: r.title,
        body: r.body,
        url: r.url,
        fireAt: new Date(r.fireAt),
      })),
    );
  }
}
