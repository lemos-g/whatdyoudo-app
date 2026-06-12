import { getUserTimezone } from "@/modules/auth";
import * as repository from "./repository";
import { DuplicateLogError, type CreateLogInput, type DailyLog } from "./types";

function getLocalDateString(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}

export async function createLog(input: CreateLogInput): Promise<DailyLog> {
  const timezone = await getUserTimezone();
  const logDate = getLocalDateString(new Date(), timezone);

  const existing = await repository.findByProjectAndDate(input.projectId, logDate);

  if (existing) {
    throw new DuplicateLogError(input.projectId, logDate);
  }

  return repository.insertLog({
    projectId: input.projectId,
    userId: input.userId,
    content: input.content,
    logDate,
  });
}

export async function getLog(projectId: string, date: string): Promise<DailyLog | null> {
  return repository.findByProjectAndDate(projectId, date);
}

export async function canEdit(logId: string): Promise<boolean> {
  const log = await repository.findById(logId);

  if (!log) {
    throw new Error(`canEdit: DailyLog ${logId} não encontrado`);
  }

  const timezone = await getUserTimezone();
  const submittedDate = getLocalDateString(new Date(log.submittedAt), timezone);
  const today = getLocalDateString(new Date(), timezone);

  return submittedDate === today;
}

export async function getRecentLogs(projectId: string, limit: number): Promise<DailyLog[]> {
  return repository.findRecentByProjectId(projectId, limit);
}
