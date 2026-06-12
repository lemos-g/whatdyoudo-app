import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DailyLog } from "@/modules/daily-log";
import { getValidationCriteria, type Project } from "@/modules/project";
import * as repository from "./repository";
import { evaluate, saveVerdict } from "./service";
import { VerdictParseError } from "./types";

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: generateContentMock };
    }
  },
}));

vi.mock("@/modules/project");
vi.mock("./repository");

const dailyLog: DailyLog = {
  id: "log-1",
  projectId: "project-1",
  userId: "user-1",
  logDate: "2026-06-12",
  content: "Implementei o módulo de autenticação e escrevi os testes.",
  verdict: null,
  verdictReason: null,
  submittedAt: "2026-06-12T12:00:00.000Z",
  updatedAt: "2026-06-12T12:00:00.000Z",
};

const project: Project = {
  id: "project-1",
  userId: "user-1",
  name: "whatdyoudo",
  description: "App para acompanhar progresso diário em projetos.",
  isActive: true,
  commitmentDays: [1, 2, 3, 4, 5],
  reminderTime: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function buildAiResponse(text: string) {
  return { response: { text: () => text } };
}

describe("verdict/service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.mocked(getValidationCriteria).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("evaluate", () => {
    it("returns the VerdictResult for a valid AI response", async () => {
      generateContentMock.mockResolvedValue(
        buildAiResponse(JSON.stringify({ verdict: "green", reason: "Bom progresso no dia." })),
      );

      const result = await evaluate(dailyLog, project);

      expect(result).toEqual({ verdict: "green", reason: "Bom progresso no dia." });
    });

    it("throws VerdictParseError when the AI response is not valid JSON", async () => {
      generateContentMock.mockResolvedValue(buildAiResponse("isso não é json"));

      await expect(evaluate(dailyLog, project)).rejects.toBeInstanceOf(VerdictParseError);
    });

    it("throws VerdictParseError when the AI response has an invalid verdict value", async () => {
      generateContentMock.mockResolvedValue(
        buildAiResponse(JSON.stringify({ verdict: "blue", reason: "..." })),
      );

      await expect(evaluate(dailyLog, project)).rejects.toBeInstanceOf(VerdictParseError);
    });

    it("throws VerdictParseError when the reason field is missing", async () => {
      generateContentMock.mockResolvedValue(buildAiResponse(JSON.stringify({ verdict: "red" })));

      await expect(evaluate(dailyLog, project)).rejects.toBeInstanceOf(VerdictParseError);
    });
  });

  describe("saveVerdict", () => {
    it("persists the verdict and reason for the log", async () => {
      const result = { verdict: "yellow" as const, reason: "Avançou pouco." };

      await saveVerdict("log-1", result);

      expect(repository.updateVerdict).toHaveBeenCalledWith("log-1", result);
    });
  });
});
