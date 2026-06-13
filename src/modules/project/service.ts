import * as repository from "./repository";
import {
  ProjectLimitExceededError,
  type CreateProjectInput,
  type Project,
  type UpdateProjectInput,
  type ValidationCriterion,
  type ValidationCriterionInput,
} from "./types";

const FREE_PLAN_PROJECT_LIMIT = 1;
const VALID_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function validateCommitmentDays(commitmentDays: number[]): void {
  if (commitmentDays.length === 0) {
    throw new Error("commitmentDays deve conter ao menos um dia da semana");
  }

  for (const day of commitmentDays) {
    if (!VALID_WEEKDAYS.includes(day)) {
      throw new Error(
        `commitmentDays deve conter valores entre 0 (domingo) e 6 (sábado), recebido: ${day}`,
      );
    }
  }
}

export async function getProject(userId: string): Promise<Project | null> {
  return repository.findActiveProjectByUserId(userId);
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  return repository.findProjectById(projectId);
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const activeProjectCount = await repository.countActiveProjects(input.userId);

  if (activeProjectCount >= FREE_PLAN_PROJECT_LIMIT) {
    throw new ProjectLimitExceededError();
  }

  if (input.commitmentDays) {
    validateCommitmentDays(input.commitmentDays);
  }

  return repository.insertProject(input);
}

export async function updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
  if (input.commitmentDays) {
    validateCommitmentDays(input.commitmentDays);
  }

  return repository.updateProject(projectId, input);
}

export async function getValidationCriteria(projectId: string): Promise<ValidationCriterion[]> {
  return repository.findActiveValidationCriteria(projectId);
}

export async function upsertValidationCriteria(
  projectId: string,
  criteria: ValidationCriterionInput[],
): Promise<ValidationCriterion[]> {
  return repository.replaceValidationCriteria(projectId, criteria);
}
