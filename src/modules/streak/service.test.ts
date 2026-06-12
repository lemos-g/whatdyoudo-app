import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repository from "./repository";
import { getStreak, processVerdict } from "./service";
import type { Streak } from "./types";

vi.mock("./repository");

function buildStreak(overrides: Partial<Streak> = {}): Streak {
  return {
    id: "streak-1",
    projectId: "project-1",
    currentStreak: 0,
    longestStreak: 0,
    lastVerdict: null,
    consecutiveRedCount: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("streak/service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(repository.updateStreak).mockResolvedValue(buildStreak());
  });

  describe("getStreak", () => {
    it("returns the project's streak", async () => {
      const streak = buildStreak({ currentStreak: 4, longestStreak: 4 });
      vi.mocked(repository.findOrCreateByProjectId).mockResolvedValue(streak);

      const result = await getStreak("project-1");

      expect(result).toEqual(streak);
      expect(repository.findOrCreateByProjectId).toHaveBeenCalledWith("project-1");
    });
  });

  describe("processVerdict", () => {
    it("increments current_streak and resets consecutive_red_count on green", async () => {
      vi.mocked(repository.findOrCreateByProjectId).mockResolvedValue(
        buildStreak({ currentStreak: 2, longestStreak: 5, consecutiveRedCount: 0 }),
      );

      const result = await processVerdict("project-1", "green");

      expect(result).toEqual({ streakReset: false, streakAlert: false });
      expect(repository.updateStreak).toHaveBeenCalledWith("project-1", {
        currentStreak: 3,
        longestStreak: 5,
        lastVerdict: "green",
        consecutiveRedCount: 0,
      });
    });

    it("increments current_streak on yellow", async () => {
      vi.mocked(repository.findOrCreateByProjectId).mockResolvedValue(
        buildStreak({ currentStreak: 2, longestStreak: 5, consecutiveRedCount: 0 }),
      );

      const result = await processVerdict("project-1", "yellow");

      expect(result).toEqual({ streakReset: false, streakAlert: false });
      expect(repository.updateStreak).toHaveBeenCalledWith("project-1", {
        currentStreak: 3,
        longestStreak: 5,
        lastVerdict: "yellow",
        consecutiveRedCount: 0,
      });
    });

    it("triggers streakAlert on the first red without resetting the streak", async () => {
      vi.mocked(repository.findOrCreateByProjectId).mockResolvedValue(
        buildStreak({ currentStreak: 3, longestStreak: 5, consecutiveRedCount: 0 }),
      );

      const result = await processVerdict("project-1", "red");

      expect(result).toEqual({ streakReset: false, streakAlert: true });
      expect(repository.updateStreak).toHaveBeenCalledWith("project-1", {
        currentStreak: 3,
        longestStreak: 5,
        lastVerdict: "red",
        consecutiveRedCount: 1,
      });
    });

    it("triggers streakReset on the second consecutive red and zeroes the streak", async () => {
      vi.mocked(repository.findOrCreateByProjectId).mockResolvedValue(
        buildStreak({ currentStreak: 3, longestStreak: 5, consecutiveRedCount: 1 }),
      );

      const result = await processVerdict("project-1", "red");

      expect(result).toEqual({ streakReset: true, streakAlert: false });
      expect(repository.updateStreak).toHaveBeenCalledWith("project-1", {
        currentStreak: 0,
        longestStreak: 5,
        lastVerdict: "red",
        consecutiveRedCount: 0,
      });
    });

    it("treats missed the same as red for consecutive_red_count", async () => {
      vi.mocked(repository.findOrCreateByProjectId).mockResolvedValue(
        buildStreak({ currentStreak: 3, longestStreak: 5, consecutiveRedCount: 0 }),
      );

      const result = await processVerdict("project-1", "missed");

      expect(result).toEqual({ streakReset: false, streakAlert: true });
      expect(repository.updateStreak).toHaveBeenCalledWith("project-1", {
        currentStreak: 3,
        longestStreak: 5,
        lastVerdict: "missed",
        consecutiveRedCount: 1,
      });
    });

    it("resets consecutive_red_count and resumes incrementing on green after a red", async () => {
      vi.mocked(repository.findOrCreateByProjectId).mockResolvedValue(
        buildStreak({ currentStreak: 3, longestStreak: 5, consecutiveRedCount: 1 }),
      );

      const result = await processVerdict("project-1", "green");

      expect(result).toEqual({ streakReset: false, streakAlert: false });
      expect(repository.updateStreak).toHaveBeenCalledWith("project-1", {
        currentStreak: 4,
        longestStreak: 5,
        lastVerdict: "green",
        consecutiveRedCount: 0,
      });
    });

    it("updates longest_streak when current_streak surpasses it", async () => {
      vi.mocked(repository.findOrCreateByProjectId).mockResolvedValue(
        buildStreak({ currentStreak: 5, longestStreak: 5, consecutiveRedCount: 0 }),
      );

      await processVerdict("project-1", "green");

      expect(repository.updateStreak).toHaveBeenCalledWith("project-1", {
        currentStreak: 6,
        longestStreak: 6,
        lastVerdict: "green",
        consecutiveRedCount: 0,
      });
    });

    it("does not decrease longest_streak after a reset", async () => {
      vi.mocked(repository.findOrCreateByProjectId).mockResolvedValue(
        buildStreak({ currentStreak: 3, longestStreak: 10, consecutiveRedCount: 1 }),
      );

      await processVerdict("project-1", "red");

      expect(repository.updateStreak).toHaveBeenCalledWith("project-1", {
        currentStreak: 0,
        longestStreak: 10,
        lastVerdict: "red",
        consecutiveRedCount: 0,
      });
    });
  });
});
