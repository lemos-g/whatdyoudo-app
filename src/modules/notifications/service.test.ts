import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectById } from "@/modules/project";
import type { Project } from "@/modules/project";
import webpush from "web-push";
import * as repository from "./repository";
import {
  sendDailyReminder,
  sendStreakAlert,
  sendStreakReset,
  subscribe,
  unsubscribe,
} from "./service";
import type { PushSubscriptionRecord, SubscribeInput } from "./types";

vi.mock("./repository");
vi.mock("@/modules/project");
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

function buildSubscription(overrides: Partial<PushSubscriptionRecord> = {}): PushSubscriptionRecord {
  return {
    id: "sub-1",
    userId: "user-1",
    endpoint: "https://push.example.com/sub-1",
    p256dh: "p256dh-key",
    auth: "auth-key",
    deviceLabel: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastUsedAt: null,
    ...overrides,
  };
}

function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    userId: "user-1",
    name: "Orbi",
    description: null,
    isActive: true,
    commitmentDays: [1, 2, 3, 4, 5],
    reminderTime: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("notifications/service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
    process.env.VAPID_MAILTO = "gabriel@whatdyoudo.com";
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);
  });

  describe("subscribe", () => {
    it("saves the push subscription for the user", async () => {
      const input: SubscribeInput = {
        endpoint: "https://push.example.com/sub-1",
        p256dh: "p256dh-key",
        auth: "auth-key",
        deviceLabel: "iPhone de Gabriel",
      };
      vi.mocked(repository.insertSubscription).mockResolvedValue(buildSubscription());

      const result = await subscribe("user-1", input);

      expect(repository.insertSubscription).toHaveBeenCalledWith("user-1", input);
      expect(result).toEqual(buildSubscription());
    });
  });

  describe("unsubscribe", () => {
    it("marks the subscription as inactive", async () => {
      await unsubscribe("https://push.example.com/sub-1");

      expect(repository.deactivateByEndpoint).toHaveBeenCalledWith(
        "https://push.example.com/sub-1",
      );
    });
  });

  describe("sendDailyReminder", () => {
    it("sends a push notification to every active subscription of the project owner", async () => {
      vi.mocked(getProjectById).mockResolvedValue(buildProject());
      vi.mocked(repository.findActiveSubscriptionsByUserId).mockResolvedValue([
        buildSubscription({ id: "sub-1", endpoint: "https://push.example.com/sub-1" }),
        buildSubscription({ id: "sub-2", endpoint: "https://push.example.com/sub-2" }),
      ]);

      await sendDailyReminder("project-1");

      expect(repository.findActiveSubscriptionsByUserId).toHaveBeenCalledWith("user-1");
      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
      expect(webpush.sendNotification).toHaveBeenCalledWith(
        {
          endpoint: "https://push.example.com/sub-1",
          keys: { p256dh: "p256dh-key", auth: "auth-key" },
        },
        expect.any(String),
      );
    });

    it("automatically unsubscribes when web-push responds with 410 Gone", async () => {
      vi.mocked(getProjectById).mockResolvedValue(buildProject());
      vi.mocked(repository.findActiveSubscriptionsByUserId).mockResolvedValue([
        buildSubscription({ id: "sub-1", endpoint: "https://push.example.com/sub-1" }),
      ]);
      vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 410 });

      await sendDailyReminder("project-1");

      expect(repository.deactivateByEndpoint).toHaveBeenCalledWith(
        "https://push.example.com/sub-1",
      );
    });

    it("does nothing when there are no active subscriptions", async () => {
      vi.mocked(getProjectById).mockResolvedValue(buildProject());
      vi.mocked(repository.findActiveSubscriptionsByUserId).mockResolvedValue([]);

      await expect(sendDailyReminder("project-1")).resolves.toBeUndefined();

      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe("sendStreakAlert", () => {
    it("sends the streak alert message", async () => {
      vi.mocked(getProjectById).mockResolvedValue(buildProject());
      vi.mocked(repository.findActiveSubscriptionsByUserId).mockResolvedValue([buildSubscription()]);

      await sendStreakAlert("project-1");

      const [, body] = vi.mocked(webpush.sendNotification).mock.calls[0];
      const payload = JSON.parse(body as string);

      expect(payload.title).toBe("Atenção ao seu streak");
      expect(payload.body).toContain("streak");
    });
  });

  describe("sendStreakReset", () => {
    it("sends the streak reset message", async () => {
      vi.mocked(getProjectById).mockResolvedValue(buildProject());
      vi.mocked(repository.findActiveSubscriptionsByUserId).mockResolvedValue([buildSubscription()]);

      await sendStreakReset("project-1");

      const [, body] = vi.mocked(webpush.sendNotification).mock.calls[0];
      const payload = JSON.parse(body as string);

      expect(payload.title).toBe("Seu streak foi zerado");
      expect(payload.body).toContain("streak");
    });
  });
});
