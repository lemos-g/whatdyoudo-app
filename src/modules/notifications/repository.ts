import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import type { PushSubscriptionRecord, SubscribeInput } from "./types";

type PushSubscriptionRow = Tables<"push_subscriptions">;

function mapSubscription(row: PushSubscriptionRow): PushSubscriptionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    deviceLabel: row.device_label,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

export async function insertSubscription(
  userId: string,
  input: SubscribeInput,
): Promise<PushSubscriptionRecord> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .insert({
      user_id: userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      device_label: input.deviceLabel ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapSubscription(data);
}

export async function deactivateByEndpoint(endpoint: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("endpoint", endpoint);

  if (error) {
    throw error;
  }
}

export async function findActiveSubscriptionsByUserId(
  userId: string,
): Promise<PushSubscriptionRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  return data.map(mapSubscription);
}
