export type PushSubscriptionRecord = {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceLabel: string | null;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

export type SubscribeInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceLabel?: string | null;
};

export type NotificationPayload = {
  title: string;
  body: string;
};
