export type Project = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  commitmentDays: number[];
  reminderTime: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectInput = {
  userId: string;
  name: string;
  description?: string | null;
  commitmentDays?: number[];
  reminderTime?: string | null;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string | null;
  commitmentDays?: number[];
  reminderTime?: string | null;
};

export type ValidationCriterion = {
  id: string;
  projectId: string;
  description: string;
  position: number;
  isActive: boolean;
};

export type ValidationCriterionInput = {
  description: string;
};

export class ProjectLimitExceededError extends Error {
  constructor() {
    super("O plano free permite no máximo 1 projeto ativo");
    this.name = "ProjectLimitExceededError";
  }
}
