import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import type { Streak, StreakVerdict } from "./types";

type StreakRow = Tables<"streaks">;

function mapStreak(row: StreakRow): Streak {
  return {
    id: row.id,
    projectId: row.project_id,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    // O CHECK constraint do banco garante green, yellow, red, missed ou null.
    lastVerdict: row.last_verdict as StreakVerdict | null,
    consecutiveRedCount: row.consecutive_red_count,
    updatedAt: row.updated_at,
  };
}

export async function findOrCreateByProjectId(projectId: string): Promise<Streak> {
  const supabase = await createClient();

  const { data: existing, error: findError } = await supabase
    .from("streaks")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    return mapStreak(existing);
  }

  const { data: created, error: insertError } = await supabase
    .from("streaks")
    .insert({ project_id: projectId })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return mapStreak(created);
}

export async function updateStreak(
  projectId: string,
  updates: {
    currentStreak: number;
    longestStreak: number;
    lastVerdict: StreakVerdict;
    consecutiveRedCount: number;
  },
): Promise<Streak> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("streaks")
    .update({
      current_streak: updates.currentStreak,
      longest_streak: updates.longestStreak,
      last_verdict: updates.lastVerdict,
      consecutive_red_count: updates.consecutiveRedCount,
    })
    .eq("project_id", projectId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapStreak(data);
}
