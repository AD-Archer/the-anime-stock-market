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
import { generateDisplaySlug } from "./usernames";

type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  emailVerification?: boolean;
};

export type SessionInfo = {
  id: string;
  provider: string;
  providerUid: string;
  ip: string;
  osName: string;
  osVersion: string;
  clientType: string;
  clientName: string;
  deviceName: string;
  deviceBrand: string;
  deviceModel: string;
  countryName: string;
  current: boolean;
  createdAt: Date;
  expiresAt: Date;
};

export type IdentityInfo = {
  id: string;
  provider: string;
  providerUid: string;
  providerEmail: string;
  createdAt: Date;
  updatedAt: Date;
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
  createPassword: (password: string) => Promise<void>;
  hasPassword: () => Promise<boolean>;
  signInWithGoogle: (params?: {
    successUrl?: string;
    failureUrl?: string;
  }) => Promise<void>;
  getLinkedProviders: () => Promise<string[]>;
  unlinkProvider: (providerId: string) => Promise<void>;
  // New enhanced auth methods
  linkGoogle: () => Promise<void>;
  updateEmail: (newEmail: string, password: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  getSessions: () => Promise<SessionInfo[]>;
  deleteSession: (sessionId: string) => Promise<void>;
  deleteAllOtherSessions: () => Promise<void>;
  getIdentities: () => Promise<IdentityInfo[]>;
  getAccountDetails: () => Promise<{
    email: string;
    emailVerification: boolean;
    name: string;
    passwordUpdate: Date | null;
    registration: Date;
    status: boolean;
    mfa: boolean;
  } | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapAccountUser(user: Models.User<Models.Preferences>): AuthUser {
  return {
    id: user.$id,
    email: user.email,
    name: user.name,
    emailVerification: user.emailVerification,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureUserDocument = async (
    accountUser: Models.User<Models.Preferences>
  ) => {
    const isServer = typeof window === "undefined";

    try {
      if (isServer) {
        const { logger } = await import("./logger");
        logger.debug("ensureUserDocument: Checking if user document exists", {
          userId: accountUser.$id,
          email: accountUser.email,
        });
      }

      const allUsers = await userService.getAll();

      // Check if user document already exists
      const existing =
        allUsers.find((user) => user.id === accountUser.$id) ||
        (await userService.getById(accountUser.$id));
      if (existing) {
        // Backfill displayName/displaySlug if missing
        const displayName =
          existing.displayName ||
          accountUser.name?.trim() ||
          accountUser.email?.split("@")[0] ||
          existing.username;
        const existingSlugs = allUsers
          .filter((user) => user.id !== accountUser.$id)
          .map((user) => user.displaySlug || user.username);
        const displaySlug =
          existing.displaySlug ||
          generateDisplaySlug(displayName, existingSlugs);

        if (!existing.displayName || !existing.displaySlug) {
          await userService.update(existing.id, {
            displayName,
            displaySlug,
            username: displaySlug, // keep slug aligned with username for links
          });
        }

        if (isServer) {
          const { logger } = await import("./logger");
          logger.debug(
            "ensureUserDocument: User document already exists, skipping creation"
          );
        }
        return;
      }

      // When linking OAuth providers, Appwrite will link them to the current account
      // So if the accountUser.$id matches the current session, it's a linking operation
      // and we should allow it even if the email exists elsewhere

      // Block duplicate email logins from OAuth: if an existing user document
      // already has this email but a different id, check if this is a linking operation
      const existingByEmail = await userService.getByEmail(accountUser.email);
      if (existingByEmail && existingByEmail.id !== accountUser.$id) {
        // Try to get current session to see if we're linking
        try {
          const currentSession = await account.getSession("current");
          // If we have a current session and the accountUser ID matches, it's linking
          // Appwrite handles provider linking automatically when you're logged in
          if (currentSession && accountUser.$id === currentSession.userId) {
            // This is a linking operation - Appwrite has already linked it
            return;
          }
        } catch {
          // No current session, so this is a new sign-in attempt
        }

        // Otherwise, prevent creating a second account with the same email
        await account.deleteSession("current");
        throw new Error(
          "Email already exists. Please sign in with your original account and link Google from settings."
        );
      }

      const displayName =
        accountUser.name?.trim() || accountUser.email?.split("@")[0] || "user";

      const existingSlugs = allUsers
        .filter((user) => user.id !== accountUser.$id)
        .map((user) => user.displaySlug || user.username);
      const uniqueSlug = generateDisplaySlug(displayName, existingSlugs);
      // Keep username aligned to slug for compatibility with existing links
      const uniqueUsername = uniqueSlug;

      if (isServer) {
        const { logger } = await import("./logger");
        logger.info("ensureUserDocument: Creating new user document", {
          userId: accountUser.$id,
          username: uniqueUsername,
          email: accountUser.email,
        });
      }

      // Check if user has OAuth identities (if they don't, they're using password auth)
      let userHasPassword = false;
      try {
        const identities = await account.listIdentities();
        userHasPassword = identities.identities.length === 0;
      } catch (error) {
        console.warn("Failed to check identities for new user", error);
        userHasPassword = false;
      }

      await userService.create({
        id: accountUser.$id,
        username: uniqueUsername,
        displayName,
        displaySlug: uniqueSlug,
        email: accountUser.email,
        balance: 100,
        isAdmin: false,
        isBanned: false,
        hasPassword: userHasPassword,
        createdAt: new Date(),
        avatarUrl: null,
        bannedUntil: null,
        showNsfw: true,
        showSpoilers: true,
        isPortfolioPublic: false,
        hideTransactions: false,
        anonymousTransactions: false,
        pendingDeletionAt: null,
        // default theme preference
        theme: "system",
      });

      if (isServer) {
        const { logger } = await import("./logger");
        logger.info("ensureUserDocument: User document created successfully");
      }

      // New accounts can claim a one-time welcome bonus.
      await awardService.create({
        userId: accountUser.$id,
        type: "welcome_bonus",
        unlockedAt: new Date(),
        redeemed: false,
      });

      if (isServer) {
        const { logger } = await import("./logger");
        logger.info("ensureUserDocument: Welcome bonus award created");
      }
    } catch (error) {
      const isServer = typeof window === "undefined";
      if (isServer) {
        const { logger } = await import("./logger");
        logger.error(
          "ensureUserDocument: Failed to ensure user document",
          error
        );
      } else {
        console.warn("Failed to ensure user document:", error);
      }
      throw error;
    }
  };

  const hydrateSessionFromUrl = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");
    const secret = params.get("secret");
    if (!userId || !secret) return false;

    // Log on server-side if this is called from server component
    const isServer = typeof window === "undefined";
    if (isServer) {
      const { logger } = await import("./logger");
      logger.info("hydrateSessionFromUrl: Found userId and secret in URL", {
        hasUserId: !!userId,
        hasSecret: !!secret,
        userIdLength: userId?.length || 0,
      });
    }

    try {
      // Ensure Appwrite client is initialized before creating session
      const { ensureAppwriteInitialized } = await import("./appwrite/appwrite");
      await ensureAppwriteInitialized();

      if (isServer) {
        const { logger } = await import("./logger");
        logger.info("hydrateSessionFromUrl: Creating session", { userId });
      }

      await account.createSession({ userId, secret });

      if (isServer) {
        const { logger } = await import("./logger");
        logger.info("hydrateSessionFromUrl: Session created successfully");
      }

      params.delete("userId");
      params.delete("secret");
      params.delete("oauth");
      const cleaned = params.toString();
      const url = `${window.location.pathname}${cleaned ? `?${cleaned}` : ""}`;
      window.history.replaceState(null, "", url);
      return true;
    } catch (error) {
      const isServer = typeof window === "undefined";
      if (isServer) {
        const { logger } = await import("./logger");
        logger.error(
          "hydrateSessionFromUrl: OAuth credential exchange failed",
          error
        );
      } else {
        console.error("OAuth credential exchange failed", error);
      }
      return false;
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      // Only log on server-side (Node.js)
      const isServer = typeof window === "undefined";
      if (isServer) {
        const { logger } = await import("./logger");
        logger.debug("fetchUser: Starting user fetch");
      }

      // Ensure Appwrite client is initialized before making any calls
      const { ensureAppwriteInitialized } = await import("./appwrite/appwrite");
      await ensureAppwriteInitialized();

      if (isServer) {
        const { logger } = await import("./logger");
        logger.debug("fetchUser: Appwrite client initialized");
      }

      await hydrateSessionFromUrl();

      // Try to get the user account
      let response;
      try {
        if (isServer) {
          const { logger } = await import("./logger");
          logger.debug("fetchUser: Attempting account.get()");
        }
        response = await account.get();

        if (isServer) {
          const { logger } = await import("./logger");
          logger.info("fetchUser: Successfully fetched user", {
            userId: response.$id,
            email: response.email,
            name: response.name,
          });
        }
      } catch (error: any) {
        // If we get a 401, check if it's a session issue
        if (error?.code === 401 || error?.response?.code === 401) {
          if (isServer) {
            const { logger } = await import("./logger");
            logger.debug(
              "fetchUser: 401 - No active session (expected when not logged in)"
            );
          }
          // Session might not be established yet - this is expected when not logged in
          setUser(null);
          setLoading(false);
          return;
        }

        if (isServer) {
          const { logger } = await import("./logger");
          logger.error("fetchUser: Error fetching account", error);
        }
        throw error;
      }

      await refreshAppwriteJwt();

      if (isServer) {
        const { logger } = await import("./logger");
        logger.debug("fetchUser: Ensuring user document exists");
      }

      await ensureUserDocument(response);

      if (isServer) {
        const { logger } = await import("./logger");
        logger.debug("fetchUser: User document ensured, setting user state");
      }

      setUser(mapAccountUser(response));
    } catch (error: any) {
      const isServer = typeof window === "undefined";
      // 401 is expected when not logged in - don't log it as an error
      // Other errors should be logged for debugging
      if (error?.code !== 401 && error?.response?.code !== 401) {
        if (isServer) {
          const { logger } = await import("./logger");
          logger.warn("fetchUser: Failed to fetch user (non-401 error)", error);
        } else {
          console.warn("Failed to fetch user:", error);
        }
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [hydrateSessionFromUrl]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Handle OAuth success parameter - refresh user when redirected after OAuth
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") === "success") {
      // Remove the parameter from URL
      params.delete("oauth");
      const newUrl = `${window.location.pathname}${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      window.history.replaceState({}, "", newUrl);

      // Refresh user data after OAuth
      fetchUser();
    }
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
        const newUserId = ID.unique();
        await account.create({
          userId: newUserId,
          email,
          password,
          name,
        });
        await account.createEmailPasswordSession(email, password);
        // Mark that this user has a password (signed up with email/password)
        try {
          await userService.update(newUserId, { hasPassword: true });
        } catch (err) {
          // User doc may not exist yet, will be created in fetchUser -> ensureUserDocument
          console.warn(
            "Could not set hasPassword immediately, will be set in ensureUserDocument"
          );
        }
        await fetchUser();
      },
      signOut: async () => {
        try {
          await account.deleteSessions(); // clear all sessions including OAuth
        } catch (err) {
          console.warn(
            "Failed to delete all sessions, falling back to current",
            err
          );
          try {
            await account.deleteSession("current");
          } catch (err2) {
            console.warn("Failed to delete current session", err2);
          }
        }
        clearAppwriteJwt();
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.removeItem("cookieFallback");
          }
        } catch (err) {
          console.warn("Failed to clear cookieFallback", err);
        }
        setUser(null);
      },
      refresh: fetchUser,
      updateName: async (name: string) => {
        const trimmed = name.trim() || "user";
        // Ensure unique display slug
        const allUsers = await userService.getAll();
        const existingSlugs = allUsers
          .filter((u) => u.id !== user?.id)
          .map((u) => u.displaySlug || u.username);
        const displaySlug = generateDisplaySlug(trimmed, existingSlugs);

        await account.updateName(trimmed);
        if (user?.id) {
          await userService.update(user.id, {
            displayName: trimmed,
            displaySlug,
            username: displaySlug,
          });
        }
        await fetchUser();
      },
      updatePassword: async (currentPassword: string, newPassword: string) => {
        await account.updatePassword(newPassword, currentPassword);
        if (user?.id) {
          // Ensure hasPassword is marked as true in database
          await userService.update(user.id, { hasPassword: true });
          await sendSystemEvent({ type: "password_changed", userId: user.id });
        }
      },
      createPassword: async (password: string) => {
        // For OAuth-only users who want to create a password
        // This allows them to sign in without OAuth
        if (!user?.id) {
          throw new Error("User not authenticated");
        }

        // Double-check the database to see if a password already exists for this account
        try {
          const userDoc = await userService.getById(user.id);
          if (userDoc?.hasPassword) {
            throw new Error(
              "Account already has a password. Use the 'Change Password' form instead."
            );
          }
        } catch (checkErr: any) {
          // If we can't check, log and proceed — the backend will still enforce correctness
          console.warn(
            "createPassword: could not verify existing password flag:",
            checkErr
          );
        }

        // Appwrite doesn't have a direct "createPassword" method for OAuth users
        // We use updatePassword with only the new password where supported
        try {
          await (account as any).updatePassword(password);

          // Mark that the user now has a password in the database
          await userService.update(user.id, {
            hasPassword: true,
          });
          if (user?.id) {
            await sendSystemEvent({
              type: "password_changed",
              userId: user.id,
            });
          }
        } catch (error: any) {
          // If Appwrite provides a message, surface it; otherwise keep a helpful hint
          const rawMsg = error?.message || "";
          // Map common Appwrite messages to user-friendly messages
          let friendly: string;
          if (
            rawMsg.includes("oldPassword") ||
            rawMsg.includes("Password must")
          ) {
            friendly =
              "Unable to create password: please ensure your password is at least 8 characters.";
          } else if (
            rawMsg.includes("Invalid credentials") ||
            rawMsg.includes("Invalid auth")
          ) {
            friendly =
              "Unable to create password: account may already have a password. Please use 'Change Password'.";
          } else {
            friendly = `Unable to create password: ${rawMsg}`;
          }
          throw new Error(friendly);
        }
      },
      hasPassword: async () => {
        try {
          if (!user?.id) {
            // Not logged in - can't have a password
            return false;
          }

          const { ensureAppwriteInitialized } = await import(
            "./appwrite/appwrite"
          );
          await ensureAppwriteInitialized();

          // First check the database flag
          const userDoc = await userService.getById(user.id);
          if (userDoc?.hasPassword === true) {
            return true;
          }

          // If database says no password, double-check by looking at identities
          // If user has NO OAuth identities, they must have signed up with email/password
          try {
            const identities = await account.listIdentities();
            const hasOAuthIdentities = identities.identities.length > 0;

            // If no OAuth identities exist, user must have a password
            if (!hasOAuthIdentities) {
              // Update the database flag for next time
              await userService.update(user.id, { hasPassword: true });
              return true;
            }
          } catch (identityError) {
            console.warn("Failed to check identities:", identityError);
          }

          return userDoc?.hasPassword ?? false;
        } catch (error) {
          console.warn("Failed to check password status:", error);
          return false;
        }
      },
      signInWithGoogle: async ({
        successUrl,
        failureUrl,
      }: {
        successUrl?: string;
        failureUrl?: string;
      } = {}) => {
        // Ensure Appwrite client is initialized before OAuth call
        const { ensureAppwriteInitialized } = await import(
          "./appwrite/appwrite"
        );
        await ensureAppwriteInitialized();

        const origin = window.location.origin;
        // Redirect directly to client-side callback page so it can receive userId/secret
        // Using OAuth2 token flow so Appwrite appends userId and secret as query parameters
        const success = successUrl ?? `${origin}/auth/oauth/callback`;
        const failure = failureUrl ?? `${origin}/api/oauth/failure`;

        await account.createOAuth2Token({
          provider: OAuthProvider.Google,
          success,
          failure,
          scopes: ["openid", "email", "profile"],
        });
      },
      getLinkedProviders: async () => {
        try {
          const { ensureAppwriteInitialized } = await import(
            "./appwrite/appwrite"
          );
          await ensureAppwriteInitialized();

          const identities = await account.listIdentities();
          return identities.identities.map((identity) => identity.provider);
        } catch (error) {
          console.warn("Failed to get linked providers:", error);
          return [];
        }
      },
      unlinkProvider: async (providerId: string) => {
        const { ensureAppwriteInitialized } = await import(
          "./appwrite/appwrite"
        );
        await ensureAppwriteInitialized();

        await account.deleteIdentity(providerId);
        await fetchUser(); // Refresh user data
      },
      // Link Google account to existing account
      linkGoogle: async () => {
        const { ensureAppwriteInitialized } = await import(
          "./appwrite/appwrite"
        );
        await ensureAppwriteInitialized();

        const origin = window.location.origin;
        // When linking, we add ?link=true to distinguish from sign-in
        const success = `${origin}/auth/oauth/callback?link=true`;
        const failure = `${origin}/api/oauth/failure?action=link`;

        await account.createOAuth2Token({
          provider: OAuthProvider.Google,
          success,
          failure,
          scopes: ["openid", "email", "profile"],
        });
      },
      // Update user email (requires password for security)
      updateEmail: async (newEmail: string, password: string) => {
        const { ensureAppwriteInitialized } = await import(
          "./appwrite/appwrite"
        );
        await ensureAppwriteInitialized();

        await account.updateEmail({ email: newEmail, password });

        // Update the email in our database as well
        if (user?.id) {
          await userService.update(user.id, { email: newEmail });
        }

        await fetchUser();
      },
      // Send email verification link
      sendEmailVerification: async () => {
        const { ensureAppwriteInitialized } = await import(
          "./appwrite/appwrite"
        );
        await ensureAppwriteInitialized();

        const origin = window.location.origin;
        const url = `${origin}/auth/verify/callback`;

        try {
          await account.createVerification({ url });
        } catch (error: any) {
          const rawMessage = error?.message || "";
          console.error(
            "sendEmailVerification failed:",
            rawMessage,
            "URL:",
            url
          );

          if (
            rawMessage.includes("URL") ||
            rawMessage.includes("hostname") ||
            rawMessage.includes("platform")
          ) {
            throw new Error(
              `Email verification failed: The URL "${url}" is not whitelisted in Appwrite. Please add your domain to Auth > Security > Hostname in the Appwrite Console.`
            );
          }
          throw error;
        }
      },
      // Request password reset email
      requestPasswordReset: async (email: string) => {
        const { ensureAppwriteInitialized } = await import(
          "./appwrite/appwrite"
        );
        await ensureAppwriteInitialized();

        const origin = window.location.origin;
        const url = `${origin}/auth/reset/callback`;

        try {
          await account.createRecovery({ email, url });
        } catch (error: any) {
          const rawMessage = error?.message || "";
          console.error(
            "requestPasswordReset failed:",
            rawMessage,
            "URL:",
            url
          );

          if (
            rawMessage.includes("URL") ||
            rawMessage.includes("hostname") ||
            rawMessage.includes("platform")
          ) {
            throw new Error(
              `Password reset failed: The URL "${url}" is not whitelisted in Appwrite. Please add your domain to Auth > Security > Hostname in the Appwrite Console.`
            );
          }
          throw error;
        }
      },
      // Get all active sessions
      getSessions: async (): Promise<SessionInfo[]> => {
        const { ensureAppwriteInitialized } = await import(
          "./appwrite/appwrite"
        );
        await ensureAppwriteInitialized();

        const sessions = await account.listSessions();
        return sessions.sessions.map((session) => ({
          id: session.$id,
          provider: session.provider,
          providerUid: session.providerUid,
          ip: session.ip,
          osName: session.osName,
          osVersion: session.osVersion,
          clientType: session.clientType,
          clientName: session.clientName,
          deviceName: session.deviceName,
          deviceBrand: session.deviceBrand,
          deviceModel: session.deviceModel,
          countryName: session.countryName,
          current: session.current,
          createdAt: new Date(session.$createdAt),
          expiresAt: new Date(session.expire),
        }));
      },
      // Delete a specific session
      deleteSession: async (sessionId: string) => {
        const { ensureAppwriteInitialized } = await import(
          "./appwrite/appwrite"
        );
        await ensureAppwriteInitialized();

        await account.deleteSession({ sessionId });
      },
      // Delete all sessions except current
      deleteAllOtherSessions: async () => {
        const { ensureAppwriteInitialized } = await import(
          "./appwrite/appwrite"
        );
        await ensureAppwriteInitialized();

        const sessions = await account.listSessions();
        const deletePromises = sessions.sessions
          .filter((session) => !session.current)
          .map((session) => account.deleteSession({ sessionId: session.$id }));

        await Promise.all(deletePromises);
      },
      // Get all linked identities (OAuth providers)
      getIdentities: async (): Promise<IdentityInfo[]> => {
        const { ensureAppwriteInitialized } = await import(
          "./appwrite/appwrite"
        );
        await ensureAppwriteInitialized();

        const identities = await account.listIdentities();
        return identities.identities.map((identity) => ({
          id: identity.$id,
          provider: identity.provider,
          providerUid: identity.providerUid,
          providerEmail: identity.providerEmail,
          createdAt: new Date(identity.$createdAt),
          updatedAt: new Date(identity.$updatedAt),
        }));
      },
      // Get detailed account information
      getAccountDetails: async () => {
        const { ensureAppwriteInitialized } = await import(
          "./appwrite/appwrite"
        );
        await ensureAppwriteInitialized();

        try {
          const accountData = await account.get();
          return {
            email: accountData.email,
            emailVerification: accountData.emailVerification,
            name: accountData.name,
            passwordUpdate: accountData.passwordUpdate
              ? new Date(accountData.passwordUpdate)
              : null,
            registration: new Date(accountData.registration),
            status: accountData.status,
            mfa: accountData.mfa,
          };
        } catch (error) {
          console.warn("Failed to get account details:", error);
          return null;
        }
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
