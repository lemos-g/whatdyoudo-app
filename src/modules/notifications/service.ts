import webpush from "web-push";
import { getProjectById } from "@/modules/project";
import * as repository from "./repository";
import type { NotificationPayload, PushSubscriptionRecord, SubscribeInput } from "./types";

const GONE_STATUS_CODE = 410;

const DAILY_REMINDER_PAYLOAD: NotificationPayload = {
  title: "Hora do seu relato diário",
  body: "Não esqueça de registrar o que você fez hoje no seu projeto.",
};

const STREAK_ALERT_PAYLOAD: NotificationPayload = {
  title: "Atenção ao seu streak",
  body: "Ontem foi vermelho — hoje é importante para não zerar seu streak.",
};

const STREAK_RESET_PAYLOAD: NotificationPayload = {
  title: "Seu streak foi zerado",
  body: "Dois dias seguidos no vermelho zeraram seu streak. Vamos recomeçar hoje.",
};

function configureWebPush(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const mailto = process.env.VAPID_MAILTO;

  if (!publicKey || !privateKey || !mailto) {
    throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_MAILTO precisam estar configuradas");
  }

  webpush.setVapidDetails(`mailto:${mailto}`, publicKey, privateKey);
}

function isGoneError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error as { statusCode: unknown }).statusCode === GONE_STATUS_CODE
  );
}

async function sendToSubscription(
  subscription: PushSubscriptionRecord,
  payload: NotificationPayload,
): Promise<void> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
  } catch (error) {
    if (isGoneError(error)) {
      await unsubscribe(subscription.endpoint);
      return;
    }

    console.error("notifications/service: failed to send push notification", error);
  }
}

async function sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
  const subscriptions = await repository.findActiveSubscriptionsByUserId(userId);

  if (subscriptions.length === 0) {
    return;
  }

  configureWebPush();

  await Promise.all(subscriptions.map((subscription) => sendToSubscription(subscription, payload)));
}

async function sendToProjectOwner(projectId: string, payload: NotificationPayload): Promise<void> {
  const project = await getProjectById(projectId);

  if (!project) {
    throw new Error(`sendToProjectOwner: Project ${projectId} não encontrado`);
  }

  await sendToUser(project.userId, payload);
}

export async function subscribe(
  userId: string,
  subscription: SubscribeInput,
): Promise<PushSubscriptionRecord> {
  return repository.insertSubscription(userId, subscription);
}

export async function unsubscribe(endpoint: string): Promise<void> {
  await repository.deactivateByEndpoint(endpoint);
}

export async function sendDailyReminder(projectId: string): Promise<void> {
  await sendToProjectOwner(projectId, DAILY_REMINDER_PAYLOAD);
}

export async function sendStreakAlert(projectId: string): Promise<void> {
  await sendToProjectOwner(projectId, STREAK_ALERT_PAYLOAD);
}

export async function sendStreakReset(projectId: string): Promise<void> {
  await sendToProjectOwner(projectId, STREAK_RESET_PAYLOAD);
}
