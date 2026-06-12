import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repository from "./repository";
import { getUser, getUserTimezone } from "./service";

vi.mock("./repository");

describe("auth/service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getUser", () => {
    it("returns the authenticated user", async () => {
      vi.mocked(repository.fetchAuthUser).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });

      const user = await getUser();

      expect(user).toEqual({ id: "user-1", email: "test@example.com" });
    });

    it("returns null when there is no authenticated user", async () => {
      vi.mocked(repository.fetchAuthUser).mockResolvedValue(null);

      const user = await getUser();

      expect(user).toBeNull();
    });
  });

  describe("getUserTimezone", () => {
    it("returns the timezone stored for the user", async () => {
      vi.mocked(repository.fetchAuthUser).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });
      vi.mocked(repository.fetchUserTimezone).mockResolvedValue("America/Sao_Paulo");

      const timezone = await getUserTimezone();

      expect(timezone).toBe("America/Sao_Paulo");
      expect(repository.fetchUserTimezone).toHaveBeenCalledWith("user-1");
    });

    it("falls back to UTC when the user has no timezone set", async () => {
      vi.mocked(repository.fetchAuthUser).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });
      vi.mocked(repository.fetchUserTimezone).mockResolvedValue(null);

      const timezone = await getUserTimezone();

      expect(timezone).toBe("UTC");
    });

    it("throws when there is no authenticated user", async () => {
      vi.mocked(repository.fetchAuthUser).mockResolvedValue(null);

      await expect(getUserTimezone()).rejects.toThrow();
    });
  });
});
