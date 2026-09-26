import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import {
  type DueReminder,
  planReplacement,
  type ReminderInput,
} from '../../domain/Reminder.js';
import type { ReminderRepository } from '../../ports/ReminderRepository.js';

@Injectable()
export class PrismaReminderRepository implements ReminderRepository {
  constructor(private readonly prisma: PrismaService) {}

  replaceScope(userId: string, scope: string, reminders: ReminderInput[]) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.reminder.findMany({ where: { userId, scope } });
      const plan = planReplacement(existing, reminders);
      if (plan.create.length > 0) {
        await tx.reminder.createMany({
          data: plan.create.map((r) => ({ ...r, userId, scope })),
        });
      }
      for (const u of plan.update) {
        await tx.reminder.update({
          where: { id: u.id },
          data: { ...u.data, ...(u.resend ? { sentAt: null } : {}) },
        });
      }
      if (plan.remove.length > 0) {
        await tx.reminder.deleteMany({ where: { id: { in: plan.remove } } });
      }
      return {
        created: plan.create.length,
        updated: plan.update.length,
        removed: plan.remove.length,
      };
    });
  }

  due(now: Date, since: Date, limit: number): Promise<DueReminder[]> {
    return this.prisma.reminder.findMany({
      where: { sentAt: null, fireAt: { lte: now, gte: since } },
      orderBy: { fireAt: 'asc' },
      take: limit,
      select: { id: true, userId: true, title: true, body: true, url: true },
    });
  }

  async markSent(ids: string[], at: Date): Promise<void> {
    if (ids.length === 0) return;
    await this.prisma.reminder.updateMany({
      where: { id: { in: ids } },
      data: { sentAt: at },
    });
  }
}
