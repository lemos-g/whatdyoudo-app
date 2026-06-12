import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import type { DailyLog, Verdict } from "./types";

type DailyLogRow = Tables<"daily_logs">;

function mapDailyLog(row: DailyLogRow): DailyLog {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    logDate: row.log_date,
    content: row.content,
    // O CHECK constraint do banco garante que verdict é green, yellow, red ou null.
    verdict: row.verdict as Verdict | null,
    verdictReason: row.verdict_reason,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

export async function findByProjectAndDate(
  projectId: string,
  logDate: string,
): Promise<DailyLog | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("project_id", projectId)
    .eq("log_date", logDate)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapDailyLog(data) : null;
}

export async function findById(logId: string): Promise<DailyLog | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("id", logId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapDailyLog(data) : null;
}

export async function findRecentByProjectId(projectId: string, limit: number): Promise<DailyLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("log_date", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data.map(mapDailyLog);
}

export async function insertLog(input: {
  projectId: string;
  userId: string;
  content: string;
  logDate: string;
}): Promise<DailyLog> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_logs")
    .insert({
      project_id: input.projectId,
      user_id: input.userId,
      content: input.content,
      log_date: input.logDate,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapDailyLog(data);
}
