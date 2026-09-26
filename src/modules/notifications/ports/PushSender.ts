import type { WebPushSubscription } from './PushSubscriptionRepository.js';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

/** `gone`: la suscripción ya no existe y hay que borrarla. */
export type PushResult = 'sent' | 'gone' | 'failed';

export interface PushSender {
  readonly publicKey: string;
  send(sub: WebPushSubscription, payload: PushPayload): Promise<PushResult>;
}
