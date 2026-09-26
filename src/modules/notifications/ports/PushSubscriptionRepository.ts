export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushSubscriptionRepository {
  save(userId: string, sub: WebPushSubscription): Promise<void>;
  remove(userId: string, endpoint: string): Promise<void>;
  /** Suscripciones agrupadas por usuario. */
  forUsers(userIds: string[]): Promise<Map<string, WebPushSubscription[]>>;
  /** El servicio de push dijo que ya no existe (404/410). */
  removeGone(endpoint: string): Promise<void>;
}
