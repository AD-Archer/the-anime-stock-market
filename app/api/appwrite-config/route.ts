import { NextResponse } from "next/server";

/**
 * API route to provide Appwrite configuration to the client at runtime.
 * This keeps configuration server-side and only exposes what's needed at runtime,
 * preventing secrets from being baked into the client bundle.
 *
 * Prefers non-public variable names (APPWRITE_*) over NEXT_PUBLIC_* variables.
 */
export async function GET() {
  // Prefer non-public variable names to avoid exposing in build
  // Fallback to NEXT_PUBLIC_* for backwards compatibility
  // The API key (APPWRITE_API_KEY) stays completely server-side and is never exposed
  const config = {
    endpoint:
      process.env.APPWRITE_ENDPOINT ||
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId:
      process.env.APPWRITE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId:
      process.env.APPWRITE_DATABASE_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
    siteUrl: process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL,
  };

  if (!config.endpoint || !config.projectId) {
    return NextResponse.json(
      { error: "Appwrite configuration not available" },
      { status: 500 }
    );
  }

  return NextResponse.json(config);
}
