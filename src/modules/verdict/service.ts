import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DailyLog } from "@/modules/daily-log";
import { getValidationCriteria, type Project } from "@/modules/project";
import * as repository from "./repository";
import { buildUserPrompt, VERDICT_SYSTEM_PROMPT } from "./prompt";
import { VerdictParseError, type VerdictResult } from "./types";

const MODEL_NAME = "gemini-2.0-flash";

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada");
  }

  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: VERDICT_SYSTEM_PROMPT,
    generationConfig: { responseMimeType: "application/json" },
  });
}

function parseVerdictResponse(raw: string): VerdictResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new VerdictParseError(raw);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new VerdictParseError(raw);
  }

  const { verdict, reason } = parsed as Record<string, unknown>;

  if (
    (verdict !== "green" && verdict !== "yellow" && verdict !== "red") ||
    typeof reason !== "string"
  ) {
    throw new VerdictParseError(raw);
  }

  return { verdict, reason };
}

export async function evaluate(dailyLog: DailyLog, project: Project): Promise<VerdictResult> {
  const validationCriteria = await getValidationCriteria(project.id);

  const prompt = buildUserPrompt({
    projectDescription: project.description,
    validationCriteria: validationCriteria.map((criterion) => criterion.description),
    dailyLogContent: dailyLog.content,
  });

  const model = getModel();
  const result = await model.generateContent(prompt);

  return parseVerdictResponse(result.response.text());
}

export async function saveVerdict(logId: string, result: VerdictResult): Promise<void> {
  await repository.updateVerdict(logId, result);
}
