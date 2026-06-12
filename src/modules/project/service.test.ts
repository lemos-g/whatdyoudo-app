import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repository from "./repository";
import { createProject, getProject } from "./service";
import { ProjectLimitExceededError, type Project } from "./types";

vi.mock("./repository");

const project: Project = {
  id: "project-1",
  userId: "user-1",
  name: "Orbi",
  description: "SaaS de portfólio para investidores brasileiros",
  isActive: true,
  commitmentDays: [1, 2, 3, 4, 5],
  reminderTime: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("project/service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getProject", () => {
    it("returns the user's active project", async () => {
      vi.mocked(repository.findActiveProjectByUserId).mockResolvedValue(project);

      const result = await getProject("user-1");

      expect(result).toEqual(project);
      expect(repository.findActiveProjectByUserId).toHaveBeenCalledWith("user-1");
    });

    it("returns null when the user has no active project", async () => {
      vi.mocked(repository.findActiveProjectByUserId).mockResolvedValue(null);

      const result = await getProject("user-1");

      expect(result).toBeNull();
    });
  });

  describe("createProject", () => {
    it("creates a project when the user is under the free plan limit", async () => {
      vi.mocked(repository.countActiveProjects).mockResolvedValue(0);
      vi.mocked(repository.insertProject).mockResolvedValue(project);

      const input = { userId: "user-1", name: "Orbi" };
      const result = await createProject(input);

      expect(result).toEqual(project);
      expect(repository.insertProject).toHaveBeenCalledWith(input);
    });

    it("throws ProjectLimitExceededError when the user already has an active project", async () => {
      vi.mocked(repository.countActiveProjects).mockResolvedValue(1);

      await expect(createProject({ userId: "user-1", name: "Orbi" })).rejects.toBeInstanceOf(
        ProjectLimitExceededError,
      );
      expect(repository.insertProject).not.toHaveBeenCalled();
    });

    it("throws when commitmentDays contains an invalid weekday", async () => {
      vi.mocked(repository.countActiveProjects).mockResolvedValue(0);

      await expect(
        createProject({ userId: "user-1", name: "Orbi", commitmentDays: [7] }),
      ).rejects.toThrow();
      expect(repository.insertProject).not.toHaveBeenCalled();
    });
  });
});
