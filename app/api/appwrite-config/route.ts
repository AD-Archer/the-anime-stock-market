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
  // Helper to remove surrounding single/double quotes and trim whitespace
  const strip = (v?: string) =>
    (v || "")
      .toString()
      .trim()
      .replace(/^['"]+|['"]+$/g, "") || undefined;

  const config: Record<string, string | undefined> = {
    endpoint:
      strip(process.env.APPWRITE_ENDPOINT) ||
      strip(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT),
    projectId:
      strip(process.env.APPWRITE_PROJECT_ID) ||
      strip(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID),
    siteUrl:
      strip(process.env.SITE_URL) || strip(process.env.NEXT_PUBLIC_SITE_URL),
  };

  // Do NOT expose server-only APPWRITE_DATABASE_ID by default. If a public
  // database id is intentionally required by the client, set
  // NEXT_PUBLIC_APPWRITE_DATABASE_ID or set EXPOSE_APPWRITE_DATABASE_ID=true.
  if (strip(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID)) {
    config.databaseId = strip(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID);
  } else if (process.env.EXPOSE_APPWRITE_DATABASE_ID === "true") {
    // Explicit opt-in to expose the server-side DB id (not recommended)
    config.databaseId = strip(process.env.APPWRITE_DATABASE_ID);
  }

  if (!config.endpoint || !config.projectId) {
    return NextResponse.json(
      { error: "Appwrite configuration not available" },
      { status: 500 }
    );
  }

  return NextResponse.json(config);
}
