export type StreakVerdict = "green" | "yellow" | "red" | "missed";

export type Streak = {
  id: string;
  projectId: string;
  currentStreak: number;
  longestStreak: number;
  lastVerdict: StreakVerdict | null;
  consecutiveRedCount: number;
  updatedAt: string;
};

export type StreakUpdateResult = {
  streakReset: boolean;
  streakAlert: boolean;
};
