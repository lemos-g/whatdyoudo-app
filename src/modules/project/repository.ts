import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
  ValidationCriterion,
  ValidationCriterionInput,
} from "./types";

type ProjectRow = Tables<"projects">;
type ValidationCriterionRow = Tables<"validation_criteria">;

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    commitmentDays: row.commitment_days,
    reminderTime: row.reminder_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapValidationCriterion(row: ValidationCriterionRow): ValidationCriterion {
  return {
    id: row.id,
    projectId: row.project_id,
    description: row.description,
    position: row.position,
    isActive: row.is_active,
  };
}

export async function findActiveProjectByUserId(userId: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProject(data) : null;
}

export async function findProjectById(projectId: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProject(data) : null;
}

export async function countActiveProjects(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function insertProject(input: CreateProjectInput): Promise<Project> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: input.userId,
      name: input.name,
      description: input.description ?? null,
      commitment_days: input.commitmentDays,
      reminder_time: input.reminderTime ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapProject(data);
}

export async function updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({
      name: input.name,
      description: input.description,
      commitment_days: input.commitmentDays,
      reminder_time: input.reminderTime,
    })
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapProject(data);
}

export async function findActiveValidationCriteria(projectId: string): Promise<ValidationCriterion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("validation_criteria")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(mapValidationCriterion);
}

export async function replaceValidationCriteria(
  projectId: string,
  criteria: ValidationCriterionInput[],
): Promise<ValidationCriterion[]> {
  const supabase = await createClient();

  const { error: deactivateError } = await supabase
    .from("validation_criteria")
    .update({ is_active: false })
    .eq("project_id", projectId)
    .eq("is_active", true);

  if (deactivateError) {
    throw deactivateError;
  }

  if (criteria.length === 0) {
    return [];
  }

  const { data, error: insertError } = await supabase
    .from("validation_criteria")
    .insert(
      criteria.map((criterion, index) => ({
        project_id: projectId,
        description: criterion.description,
        position: index,
      })),
    )
    .select();

  if (insertError) {
    throw insertError;
  }

  return data.map(mapValidationCriterion).sort((a, b) => a.position - b.position);
}
