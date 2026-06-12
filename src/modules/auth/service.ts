import * as repository from "./repository";
import type { AuthUser } from "./types";

const DEFAULT_TIMEZONE = "UTC";

export async function getUser(): Promise<AuthUser | null> {
  return repository.fetchAuthUser();
}

export async function getUserTimezone(): Promise<string> {
  const user = await repository.fetchAuthUser();

  if (!user) {
    throw new Error("getUserTimezone: no authenticated user");
  }

  const timezone = await repository.fetchUserTimezone(user.id);

  return timezone ?? DEFAULT_TIMEZONE;
}
