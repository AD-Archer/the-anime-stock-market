"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ID, type Models } from "appwrite";
import { account } from "./appwrite";
import { userService } from "./database";

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
        balance: 0,
        isAdmin: false,
        createdAt: new Date(),
        isBanned: false,
      });
    } catch (error) {
      console.warn("Failed to ensure user document:", error);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await account.get();
      await ensureUserDocument(response);
      setUser(mapAccountUser(response));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

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
    }),
    [user, loading]
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
