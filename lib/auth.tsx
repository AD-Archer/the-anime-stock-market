"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  useCallback,
} from "react";
import { ID, OAuthProvider, type Models } from "appwrite";
import {
  account,
  clearAppwriteJwt,
  refreshAppwriteJwt,
} from "./appwrite/appwrite";
import { userService } from "./database";
import { awardService } from "./database/awardService";
import { sendSystemEvent } from "./system-events-client";
import { makeUniqueUsername, generateRandomUsername } from "./usernames";

type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updatePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  signInWithGoogle: (params?: {
    successUrl?: string;
    failureUrl?: string;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapAccountUser(user: Models.User<Models.Preferences>): AuthUser {
  return {
    id: user.$id,
    email: user.email,
    name: user.name,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureUserDocument = async (
    accountUser: Models.User<Models.Preferences>
  ) => {
    try {
      // Block duplicate email logins from OAuth: if an existing user document
      // already has this email but a different id, force sign-out and abort.
      const existingByEmail = await userService.getByEmail(accountUser.email);
      if (existingByEmail && existingByEmail.id !== accountUser.$id) {
        // Prevent creating a second account with the same email.
        await account.deleteSession("current");
        throw new Error(
          "Email already exists. Please sign in with your original account and link Google from settings."
        );
      }

      const existing = await userService.getById(accountUser.$id);
      if (existing) return;

      const usernameBase =
        accountUser.name?.trim() || accountUser.email?.split("@")[0] || "user";

      const existingUsers = await userService.getAll();
      const existingNames = existingUsers.map((user) => user.username);
      const uniqueUsername =
        usernameBase === "user"
          ? generateRandomUsername(existingNames)
          : makeUniqueUsername(usernameBase, existingNames);

      await userService.create({
        id: accountUser.$id,
        username: uniqueUsername,
        email: accountUser.email,
        balance: 100,
        isAdmin: false,
        createdAt: new Date(),
        avatarUrl: null,
        bannedUntil: null,
        showNsfw: true,
        showSpoilers: true,
        isPortfolioPublic: false,
        hideTransactions: false,
        anonymousTransactions: false,
        pendingDeletionAt: null,
      });

      // New accounts can claim a one-time welcome bonus.
      await awardService.create({
        userId: accountUser.$id,
        type: "welcome_bonus",
        unlockedAt: new Date(),
        redeemed: false,
      });
    } catch (error) {
      console.warn("Failed to ensure user document:", error);
      throw error;
    }
  };

  const hydrateSessionFromUrl = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");
    const secret = params.get("secret");
    if (!userId || !secret) return false;
    try {
      await account.createSession({ userId, secret });
      params.delete("userId");
      params.delete("secret");
      params.delete("oauth");
      const cleaned = params.toString();
      const url = `${window.location.pathname}${cleaned ? `?${cleaned}` : ""}`;
      window.history.replaceState(null, "", url);
      return true;
    } catch (error) {
      console.error("OAuth credential exchange failed", error);
      return false;
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      await hydrateSessionFromUrl();
      const response = await account.get();
      await refreshAppwriteJwt();
      await ensureUserDocument(response);

      setUser(mapAccountUser(response));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async (email, password) => {
        await account.createEmailPasswordSession(email, password);
        await fetchUser();
      },
      signUp: async (name, email, password) => {
        await account.create({
          userId: ID.unique(),
          email,
          password,
          name,
        });
        await account.createEmailPasswordSession(email, password);
        await fetchUser();
      },
      signOut: async () => {
        await account.deleteSession("current");
        clearAppwriteJwt();
        setUser(null);
      },
      refresh: fetchUser,
      updateName: async (name: string) => {
        await account.updateName(name);
        await fetchUser();
      },
      updatePassword: async (currentPassword: string, newPassword: string) => {
        await account.updatePassword(newPassword, currentPassword);
        if (user?.id) {
          await sendSystemEvent({ type: "password_changed", userId: user.id });
        }
      },
      signInWithGoogle: async ({
        successUrl,
        failureUrl,
      }: {
        successUrl?: string;
        failureUrl?: string;
      } = {}) => {
        const origin = window.location.origin;
        const success = successUrl ?? `${origin}/api/oauth/success`;
        const failure = failureUrl ?? `${origin}/api/oauth/failure`;

        await account.createOAuth2Session({
          provider: OAuthProvider.Google,
          success,
          failure,
          scopes: ["openid", "email", "profile"],
        });
      },
    }),
    [user, loading, fetchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
