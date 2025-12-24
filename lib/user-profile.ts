import type { User } from "./types";

export type UserProfileRef = Pick<User, "id" | "username"> & {
  displaySlug?: string;
};

export const getUserProfileSlug = (
  user?: UserProfileRef | null,
  fallbackId?: string
): string =>
  (user as any)?.displaySlug ||
  user?.username ||
  fallbackId ||
  "";

export const getUserProfileHref = (
  user?: UserProfileRef | null,
  fallbackId?: string
): string => `/users/${encodeURIComponent(getUserProfileSlug(user, fallbackId))}`;
