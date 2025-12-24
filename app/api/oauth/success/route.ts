import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { account } from "@/lib/appwrite/appwrite";
import { ensureAppwriteInitialized } from "@/lib/appwrite/appwrite";

export async function GET(req: Request) {
  const incoming = new URL(req.url);

  logger.info("OAuth success route called", {
    url: incoming.toString(),
    searchParams: Object.fromEntries(incoming.searchParams.entries()),
    headers: {
      cookie: req.headers.get("cookie") ? "present" : "missing",
      referer: req.headers.get("referer"),
    },
  });

  // Check if this is a linking operation (has linked=google param)
  const linked = incoming.searchParams.get("linked");
  const userId = incoming.searchParams.get("userId");
  const secret = incoming.searchParams.get("secret");

  logger.info("OAuth success params", {
    linked,
    hasUserId: !!userId,
    hasSecret: !!secret,
    userIdLength: userId?.length || 0,
    secretLength: secret?.length || 0,
  });

  // If we have userId and secret, redirect to callback page to create session
  if (userId && secret) {
    logger.info(
      "OAuth success: Found userId and secret, redirecting to callback"
    );
    const destination = new URL("/auth/oauth/callback", incoming.origin);
    destination.searchParams.set("userId", userId);
    destination.searchParams.set("secret", secret);
    if (linked === "google") {
      destination.searchParams.set("link", "true");
    }
    // Preserve redirectTo if present
    const redirectTo = incoming.searchParams.get("redirectTo");
    if (redirectTo) {
      destination.searchParams.set("redirectTo", redirectTo);
    }
    return NextResponse.redirect(destination);
  }

  // If no userId/secret, Appwrite may have created session via cookies
  // Try to verify session exists by checking cookies
  logger.info(
    "OAuth success: No userId/secret in URL, checking if session exists via cookies"
  );

  try {
    await ensureAppwriteInitialized();

    // Try to get the current session to see if Appwrite created it automatically
    try {
      const user = await account.get();
      logger.info("OAuth success: Session exists! User is logged in", {
        userId: user.$id,
        email: user.email,
      });

      // Session exists, redirect appropriately
      if (linked === "google") {
        const destination = new URL("/api/oauth/link-success", incoming.origin);
        incoming.searchParams.forEach((value, key) => {
          destination.searchParams.set(key, value);
        });
        logger.info("Redirecting to link-success (session exists)", {
          destination: destination.toString(),
        });
        return NextResponse.redirect(destination);
      }

      // Normal sign-in with existing session
      const destination = new URL("/market", incoming.origin);
      destination.searchParams.set("oauth", "success");
      logger.info("Redirecting to market (session exists)", {
        destination: destination.toString(),
      });
      return NextResponse.redirect(destination);
    } catch (error: any) {
      logger.warn("OAuth success: No active session found", {
        error: error?.message || String(error),
        code: error?.code,
      });

      // No session - this shouldn't happen, but redirect anyway
      // The client-side callback will handle it
      const destination = new URL("/auth/oauth/callback", incoming.origin);
      if (linked === "google") {
        destination.searchParams.set("link", "true");
      }
      logger.info("Redirecting to callback (no session found)", {
        destination: destination.toString(),
      });
      return NextResponse.redirect(destination);
    }
  } catch (error) {
    logger.error("OAuth success: Error checking session", error);

    // Fallback: redirect to callback page
    const destination = new URL("/auth/oauth/callback", incoming.origin);
    if (linked === "google") {
      destination.searchParams.set("link", "true");
    }
    return NextResponse.redirect(destination);
  }
}
