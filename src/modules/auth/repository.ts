import { createClient } from "@/lib/supabase/server";
import type { AuthUser } from "./types";

export async function fetchAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return { id: data.user.id, email: data.user.email ?? null };
}

export async function fetchUserTimezone(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("timezone")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("fetchUserTimezone: failed to load timezone", error);
    return null;
  }

  return data.timezone;
}
