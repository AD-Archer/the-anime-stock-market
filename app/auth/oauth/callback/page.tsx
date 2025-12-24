"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { account } from "@/lib/appwrite/appwrite";
import { useAuth } from "@/lib/auth";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();

  // Helper to get param from query or hash
  const getParam = (
    key: string,
    searchParams: URLSearchParams
  ): string | null => {
    // First check query params
    const queryValue = searchParams.get(key);
    if (queryValue) return queryValue;

    // Then check hash params
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      return hashParams.get(key);
    }

    return null;
  };

  // Memoize OAuth parameters to avoid unnecessary re-renders
  const oauthParams = useMemo(() => {
    const userId = getParam("userId", search);
    const secret = getParam("secret", search);
    const isLinking =
      getParam("link", search) === "true" || search.get("link") === "true";
    const redirectTo =
      getParam("redirectTo", search) || search.get("redirectTo");
    return { userId, secret, isLinking, redirectTo };
  }, [search]);

  const { userId, secret, isLinking, redirectTo } = oauthParams;
  const { refresh } = useAuth();
  const [status, setStatus] = useState(
    isLinking ? "Linking Google account..." : "Completing OAuth sign-in..."
  );

  // Log all URL parameters for debugging (both query and hash)
  useEffect(() => {
    const allParams: Record<string, string> = {};
    search.forEach((value, key) => {
      allParams[key] = value;
    });

    // Also check URL hash for parameters (some OAuth flows use hash)
    const hashParams: Record<string, string> = {};
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.substring(1); // Remove #
      const hashSearch = new URLSearchParams(hash);
      hashSearch.forEach((value, key) => {
        hashParams[key] = value;
      });
    }

    console.log("[OAuth Callback] URL query parameters:", allParams);
    console.log("[OAuth Callback] URL hash parameters:", hashParams);
    console.log(
      "[OAuth Callback] Full URL:",
      typeof window !== "undefined" ? window.location.href : "N/A"
    );
    console.log(
      "[OAuth Callback] Hash:",
      typeof window !== "undefined" ? window.location.hash : "N/A"
    );
  }, [search]);

  const hasHandledOauthRef = useRef(false);

  useEffect(() => {
    const finish = async () => {
      console.log("[OAuth Callback] Starting OAuth callback handler", {
        hasUserId: !!userId,
        hasSecret: !!secret,
        isLinking,
        redirectTo,
      });

      try {
        const getUserSlug = async (id: string): Promise<string> => {
          try {
            const { userService } = await import("@/lib/database");
            const userDoc = await userService.getById(id);
            return (
              userDoc?.displaySlug || userDoc?.username || userDoc?.id || id
            );
          } catch {
            return id;
          }
        };

        // Ensure Appwrite client is initialized
        const { ensureAppwriteInitialized } = await import(
          "@/lib/appwrite/appwrite"
        );
        await ensureAppwriteInitialized();
        console.log("[OAuth Callback] Appwrite client initialized");

        // First, check if we already have a session (Appwrite might have set it via cookies)
        let hasExistingSession = false;
        try {
          const existingUser = await account.get();
          console.log("[OAuth Callback] Found existing session!", {
            userId: existingUser.$id,
            email: existingUser.email,
          });
          hasExistingSession = true;

          // If we have an existing session and this is not linking, we're done
          if (!isLinking) {
            console.log(
              "[OAuth Callback] Session exists, refreshing auth state"
            );
            await refresh();
            setStatus("Signed in! Redirecting...");

            // Small delay then redirect
            await new Promise((resolve) => setTimeout(resolve, 200));
            if (redirectTo) {
              router.replace(
                redirectTo +
                  (redirectTo.includes("?") ? "&" : "?") +
                  "oauth=success"
              );
            } else {
              router.replace("/market?oauth=success");
            }
            return;
          }
        } catch (error: any) {
          console.log("[OAuth Callback] No existing session found", {
            error: error?.message,
            code: error?.code,
          });
          // No existing session - continue with normal flow
        }

        if (isLinking) {
          // When linking, Appwrite may have already linked the provider server-side
          // Check if we're logged in and the provider is now linked
          try {
            const currentUser = await account.get();
            setStatus("Checking link status...");

            // Prevent double linking: if Google is already linked, skip
            try {
              const identities = await account.listIdentities();
              const alreadyLinked = identities.identities.some(
                (identity) => identity.provider === "google"
              );
              if (alreadyLinked) {
                setStatus("Google already linked. Redirecting...");
                // Redirect to profile or market
                await new Promise((resolve) => setTimeout(resolve, 150));
                const slug = await getUserSlug(currentUser.$id);
                router.replace(`/users/${slug}?linked=google`);
                return;
              }
            } catch (err) {
              console.warn("Failed to check linked identities", err);
            }

            // If we have userId/secret, create the session
            if (userId && secret) {
              // Verify the user ID matches (Appwrite should link to current account)
              if (currentUser.$id === userId) {
                setStatus("Account linked! Redirecting...");
              } else {
                // This shouldn't happen when linking, but handle it
                await account.createSession(userId, secret);
                setStatus("Account linked! Redirecting...");
              }
            } else {
              // No userId/secret means Appwrite already handled the linking server-side
              setStatus("Account linked! Redirecting...");
            }
          } catch (error) {
            // Not logged in - this shouldn't happen when linking, but handle it
            if (userId && secret) {
              await account.createSession(userId, secret);
              setStatus("Signed in! Redirecting...");
            } else {
              throw new Error("Missing OAuth parameters for linking");
            }
          }
        } else {
          // Normal sign-in
          if (!userId || !secret) {
            // If we already have a session, use it
            if (hasExistingSession) {
              console.log(
                "[OAuth Callback] No userId/secret but session exists, using existing session"
              );
              await refresh();
              setStatus("Signed in! Redirecting...");

              await new Promise((resolve) => setTimeout(resolve, 200));
              if (redirectTo) {
                router.replace(
                  redirectTo +
                    (redirectTo.includes("?") ? "&" : "?") +
                    "oauth=success"
                );
              } else {
                router.replace("/market?oauth=success");
              }
              return;
            }

            console.error(
              "[OAuth Callback] Missing OAuth parameters and no existing session",
              {
                hasUserId: !!userId,
                hasSecret: !!secret,
                url: window.location.href,
              }
            );

            // Show helpful error message
            setStatus(
              "OAuth configuration issue: Appwrite didn't pass authentication parameters. " +
                "Please check that http://localhost:3000/auth/oauth/callback is whitelisted in your Appwrite Console (Auth → Settings → OAuth redirect URLs)."
            );

            // Log detailed info for debugging
            console.error("[OAuth Callback] Configuration check needed:", {
              currentUrl: window.location.href,
              expectedParams: ["userId", "secret"],
              receivedParams: Array.from(search.keys()),
              appwriteEndpoint:
                process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "not set",
              suggestion:
                "Check Appwrite Console → Auth → Settings → OAuth redirect URLs and ensure this URL is whitelisted",
            });

            return;
          }

          console.log(
            "[OAuth Callback] Creating session with userId and secret"
          );
          // Create the session
          try {
            await account.createSession(userId, secret);
            console.log("[OAuth Callback] Session created successfully");
          } catch (sessionError: any) {
            // If session already exists, that's fine - just log it
            if (
              sessionError?.message?.includes("already") ||
              sessionError?.code === 401
            ) {
              console.log(
                "[OAuth Callback] Session already exists, continuing with existing session"
              );
            } else {
              throw sessionError;
            }
          }
          console.log("[OAuth Callback] Session verified, verifying user...");
          setStatus("Signed in! Verifying session...");

          // Verify the session was created successfully
          try {
            const user = await account.get();
            if (!user) {
              throw new Error("Failed to verify session");
            }
            console.log("[OAuth Callback] Session verified successfully", {
              userId: user.$id,
              email: user.email,
            });
            setStatus("Signed in! Redirecting...");
          } catch (error) {
            console.error(
              "[OAuth Callback] Failed to verify session after OAuth:",
              error
            );
            setStatus("Failed to verify session. Please try again.");
            return;
          }
        }

        // Refresh auth state to get updated user info and ensure user document exists
        try {
          await refresh();
        } catch (error) {
          console.error("Failed to refresh auth state:", error);
          // Continue anyway - the session is created
        }

        // Small delay to ensure session cookie is set and propagated
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Determine redirect destination
        if (redirectTo) {
          router.replace(
            redirectTo +
              (redirectTo.includes("?") ? "&" : "?") +
              "oauth=success"
          );
        } else if (isLinking) {
          // If linking, try to redirect to user profile
          try {
            const user = await account.get();
            // Redirect to profile settings or user page
            const slug = await getUserSlug(user.$id);
            router.replace(`/users/${slug}?linked=google`);
          } catch {
            router.replace("/market?linked=google");
          }
        } else {
          // Add oauth=success to trigger a refresh on the destination page
          router.replace("/market?oauth=success");
        }
      } catch (err) {
        console.error("[OAuth Callback] OAuth callback failed", err);
        setStatus(
          isLinking
            ? "Failed to link Google account. Please try again."
            : "Failed to complete OAuth sign-in."
        );
      }
    };

    if (hasHandledOauthRef.current) {
      console.warn(
        "[OAuth Callback] Skip handling because workflow already ran once"
      );
      return;
    }

    hasHandledOauthRef.current = true;
    finish();
  }, [router, secret, userId, isLinking, redirectTo, refresh, search]);

  // Log when component mounts
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentSearch = new URLSearchParams(window.location.search);
    console.log("[OAuth Callback] Component mounted", {
      url: window.location.href,
      searchParams: Object.fromEntries(currentSearch.entries()),
      hash: window.location.hash,
    });
  }, []);

  // Show helpful error if we're stuck without parameters
  if (
    !isLinking &&
    !userId &&
    !secret &&
    status.includes("Missing OAuth parameters")
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm max-w-md space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            OAuth Configuration Issue
          </h2>
          <p className="text-sm text-muted-foreground">
            Appwrite didn&apos;t pass authentication parameters. This usually
            means the redirect URL needs to be whitelisted.
          </p>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">To fix this:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to your Appwrite Console</li>
              <li>
                Navigate to:{" "}
                <strong>Auth → Settings → OAuth redirect URLs</strong>
              </li>
              <li>
                Add this URL:{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  http://localhost:3000/auth/oauth/callback
                </code>
              </li>
              <li>
                For production, also add:{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  https://yourdomain.com/auth/oauth/callback
                </code>
              </li>
            </ol>
          </div>
          <div className="pt-4">
            <button
              onClick={() => router.push("/auth/signin")}
              className="text-sm text-primary hover:underline"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <p className="text-foreground">{status}</p>
      </div>
    </div>
  );
}
