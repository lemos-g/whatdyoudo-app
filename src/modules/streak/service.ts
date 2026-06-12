import * as repository from "./repository";
import type { Streak, StreakUpdateResult, StreakVerdict } from "./types";

const STREAK_ALERT_THRESHOLD = 1;
const STREAK_RESET_THRESHOLD = 2;

export async function getStreak(projectId: string): Promise<Streak> {
  return repository.findOrCreateByProjectId(projectId);
}

export async function processVerdict(
  projectId: string,
  verdict: StreakVerdict,
): Promise<StreakUpdateResult> {
  const streak = await repository.findOrCreateByProjectId(projectId);

  let currentStreak = streak.currentStreak;
  let consecutiveRedCount = streak.consecutiveRedCount;
  let streakAlert = false;
  let streakReset = false;

  if (verdict === "green" || verdict === "yellow") {
    currentStreak += 1;
    consecutiveRedCount = 0;
  } else {
    consecutiveRedCount += 1;

    if (consecutiveRedCount === STREAK_ALERT_THRESHOLD) {
      streakAlert = true;
    } else if (consecutiveRedCount >= STREAK_RESET_THRESHOLD) {
      streakReset = true;
      currentStreak = 0;
      consecutiveRedCount = 0;
    }
  }

  const longestStreak = Math.max(streak.longestStreak, currentStreak);

  await repository.updateStreak(projectId, {
    currentStreak,
    longestStreak,
    lastVerdict: verdict,
    consecutiveRedCount,
  });

  return { streakReset, streakAlert };
}
