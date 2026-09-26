import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type {
  PushSubscriptionRepository,
  WebPushSubscription,
} from '../../ports/PushSubscriptionRepository.js';

@Injectable()
export class PrismaPushSubscriptionRepository implements PushSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, sub: WebPushSubscription): Promise<void> {
    // El endpoint es único: si el navegador cambia de usuario, la suscripción pasa al nuevo.
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
      update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
  }

  async remove(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  async forUsers(
    userIds: string[],
  ): Promise<Map<string, WebPushSubscription[]>> {
    const rows = await this.prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });
    const out = new Map<string, WebPushSubscription[]>();
    for (const r of rows) {
      const list = out.get(r.userId) ?? [];
      list.push({
        endpoint: r.endpoint,
        keys: { p256dh: r.p256dh, auth: r.auth },
      });
      out.set(r.userId, list);
    }
    return out;
  }

  async removeGone(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }
}
