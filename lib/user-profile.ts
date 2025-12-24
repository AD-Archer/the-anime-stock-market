import type { User } from "./types";

export type UserProfileRef = Pick<User, "id" | "username">;

export const getUserProfileSlug = (
  user?: UserProfileRef | null,
  fallbackId?: string
): string => user?.username || fallbackId || "";

export const getUserProfileHref = (
  user?: UserProfileRef | null,
  fallbackId?: string
): string => `/users/${encodeURIComponent(getUserProfileSlug(user, fallbackId))}`;
