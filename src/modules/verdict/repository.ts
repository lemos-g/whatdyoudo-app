import { createClient } from "@/lib/supabase/server";
import type { VerdictResult } from "./types";

export async function updateVerdict(logId: string, result: VerdictResult): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_logs")
    .update({ verdict: result.verdict, verdict_reason: result.reason })
    .eq("id", logId);

  if (error) {
    throw error;
  }
}
