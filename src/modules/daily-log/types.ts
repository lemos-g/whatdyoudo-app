export type Verdict = "green" | "yellow" | "red";

export type DailyLog = {
  id: string;
  projectId: string;
  userId: string;
  logDate: string;
  content: string;
  verdict: Verdict | null;
  verdictReason: string | null;
  submittedAt: string;
  updatedAt: string;
};

export type CreateLogInput = {
  projectId: string;
  userId: string;
  content: string;
};

export class DuplicateLogError extends Error {
  constructor(projectId: string, logDate: string) {
    super(`Já existe um DailyLog para o projeto ${projectId} na data ${logDate}`);
    this.name = "DuplicateLogError";
  }
}
