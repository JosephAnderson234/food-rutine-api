import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush, { WebPushError } from 'web-push';
import type {
  PushPayload,
  PushResult,
  PushSender,
} from '../../ports/PushSender.js';
import type { WebPushSubscription } from '../../ports/PushSubscriptionRepository.js';

@Injectable()
export class WebPushSender implements PushSender {
  private readonly logger = new Logger(WebPushSender.name);
  readonly publicKey: string;

  constructor(config: ConfigService) {
    this.publicKey = config.getOrThrow<string>('VAPID_PUBLIC_KEY');
    webpush.setVapidDetails(
      config.getOrThrow<string>('VAPID_SUBJECT'),
      this.publicKey,
      config.getOrThrow<string>('VAPID_PRIVATE_KEY'),
    );
  }

  async send(
    sub: WebPushSubscription,
    payload: PushPayload,
  ): Promise<PushResult> {
    try {
      // TTL de 30 min: si el teléfono está apagado más tiempo, el aviso ya no sirve.
      await webpush.sendNotification(sub, JSON.stringify(payload), {
        TTL: 1800,
        urgency: 'high',
      });
      return 'sent';
    } catch (e) {
      if (
        e instanceof WebPushError &&
        (e.statusCode === 404 || e.statusCode === 410)
      )
        return 'gone';
      this.logger.warn(
        `Push falló: ${e instanceof Error ? e.message : String(e)}`,
      );
      return 'failed';
    }
  }
}
