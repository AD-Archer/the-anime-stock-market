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
import { account } from "./appwrite/appwrite";
import { userService } from "./database";
import { awardService } from "./database/awardService";
import { sendSystemEvent } from "./system-events-client";

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
  signInWithGoogle: () => Promise<void>;
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
      const existing = await userService.getById(accountUser.$id);
      if (existing) return;

      const username =
        accountUser.name?.trim() || accountUser.email?.split("@")[0] || "user";

      await userService.create({
        id: accountUser.$id,
        username,
        email: accountUser.email,
        balance: 100,
        isAdmin: false,
        createdAt: new Date(),
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
    }
  };

  const fetchUser = useCallback(async () => {
    try {
      const response = await account.get();
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
      signInWithGoogle: async () => {
        await account.createOAuth2Session(
          OAuthProvider.Google,
          `${window.location.origin}/market`,
          `${window.location.origin}/auth/signin`
        );
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
