import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserTimezone } from "@/modules/auth";
import * as repository from "./repository";
import { canEdit, createLog } from "./service";
import { DuplicateLogError, type DailyLog } from "./types";

vi.mock("./repository");
vi.mock("@/modules/auth");

function buildLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    id: "log-1",
    projectId: "project-1",
    userId: "user-1",
    logDate: "2026-06-12",
    content: "Avancei na feature X",
    verdict: null,
    verdictReason: null,
    submittedAt: "2026-06-12T12:00:00.000Z",
    updatedAt: "2026-06-12T12:00:00.000Z",
    ...overrides,
  };
}

describe("daily-log/service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createLog", () => {
    it("creates a log when none exists yet for the day", async () => {
      vi.mocked(getUserTimezone).mockResolvedValue("America/Sao_Paulo");
      vi.mocked(repository.findByProjectAndDate).mockResolvedValue(null);
      const log = buildLog();
      vi.mocked(repository.insertLog).mockResolvedValue(log);

      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-12T15:00:00.000Z"));

      const result = await createLog({
        projectId: "project-1",
        userId: "user-1",
        content: "Avancei na feature X",
      });

      expect(result).toEqual(log);
      expect(repository.insertLog).toHaveBeenCalledWith({
        projectId: "project-1",
        userId: "user-1",
        content: "Avancei na feature X",
        logDate: "2026-06-12",
      });
    });

    it("rejects when a log already exists for the project on that day", async () => {
      vi.mocked(getUserTimezone).mockResolvedValue("America/Sao_Paulo");
      vi.mocked(repository.findByProjectAndDate).mockResolvedValue(buildLog());

      await expect(
        createLog({ projectId: "project-1", userId: "user-1", content: "Outro relato" }),
      ).rejects.toBeInstanceOf(DuplicateLogError);
      expect(repository.insertLog).not.toHaveBeenCalled();
    });

    it("calculates log_date using the user's timezone, not UTC", async () => {
      vi.mocked(getUserTimezone).mockResolvedValue("America/Sao_Paulo");
      vi.mocked(repository.findByProjectAndDate).mockResolvedValue(null);
      vi.mocked(repository.insertLog).mockResolvedValue(buildLog());

      // 02:00 UTC = 23:00 do dia anterior em America/Sao_Paulo (UTC-3)
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-12T02:00:00.000Z"));

      await createLog({ projectId: "project-1", userId: "user-1", content: "Relato" });

      expect(repository.findByProjectAndDate).toHaveBeenCalledWith("project-1", "2026-06-11");
      expect(repository.insertLog).toHaveBeenCalledWith(
        expect.objectContaining({ logDate: "2026-06-11" }),
      );
    });
  });

  describe("canEdit", () => {
    it("returns true when the log was submitted today in the user's timezone", async () => {
      vi.mocked(getUserTimezone).mockResolvedValue("America/Sao_Paulo");
      vi.mocked(repository.findById).mockResolvedValue(
        buildLog({ submittedAt: "2026-06-12T15:00:00.000Z" }),
      );

      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-12T20:00:00.000Z"));

      const result = await canEdit("log-1");

      expect(result).toBe(true);
    });

    it("returns false when the log was submitted yesterday in the user's timezone", async () => {
      vi.mocked(getUserTimezone).mockResolvedValue("America/Sao_Paulo");
      vi.mocked(repository.findById).mockResolvedValue(
        buildLog({ submittedAt: "2026-06-11T15:00:00.000Z" }),
      );

      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-12T20:00:00.000Z"));

      const result = await canEdit("log-1");

      expect(result).toBe(false);
    });
  });
});
