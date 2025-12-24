import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * OAuth link success handler - redirects to user profile after linking
 * This route handles the OAuth callback when linking an account
 */
export async function GET(req: Request) {
  const incoming = new URL(req.url);

  logger.info("OAuth link-success route called", {
    url: incoming.toString(),
    searchParams: Object.fromEntries(incoming.searchParams.entries()),
  });

  // Redirect to a page that will handle the session creation and redirect
  // We'll use the oauth callback page but with a special flag
  const destination = new URL("/auth/oauth/callback", incoming.origin);

  // Preserve ALL query parameters from the incoming URL
  incoming.searchParams.forEach((value, key) => {
    destination.searchParams.set(key, value);
  });

  // Ensure the link flag is set
  destination.searchParams.set("link", "true");

  logger.info("Redirecting to OAuth callback for linking", {
    destination: destination.toString(),
    finalParams: Object.fromEntries(destination.searchParams.entries()),
  });

  return NextResponse.redirect(destination);
}
