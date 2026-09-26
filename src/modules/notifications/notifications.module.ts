import { Module } from '@nestjs/common';
import { NotificationsService } from './application/notifications.service.js';
import { ReminderDispatcher } from './application/reminder-dispatcher.js';
import { PrismaPushSubscriptionRepository } from './infrastructure/prisma/PrismaPushSubscriptionRepository.js';
import { PrismaReminderRepository } from './infrastructure/prisma/PrismaReminderRepository.js';
import { WebPushSender } from './infrastructure/webpush/WebPushSender.js';
import {
  PUSH_SENDER,
  PUSH_SUBSCRIPTION_REPOSITORY,
  REMINDER_REPOSITORY,
} from './notifications.tokens.js';
import {
  PushController,
  RemindersController,
} from './presentation/push.controller.js';

@Module({
  controllers: [PushController, RemindersController],
  providers: [
    NotificationsService,
    ReminderDispatcher,
    { provide: REMINDER_REPOSITORY, useClass: PrismaReminderRepository },
    {
      provide: PUSH_SUBSCRIPTION_REPOSITORY,
      useClass: PrismaPushSubscriptionRepository,
    },
    { provide: PUSH_SENDER, useClass: WebPushSender },
  ],
})
export class NotificationsModule {}
