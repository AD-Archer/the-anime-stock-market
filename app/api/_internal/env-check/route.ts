import { NextResponse } from "next/server";

// Safe debug endpoint that reports presence (not values) of server-only env vars.
// Enabled only when NODE_ENV !== 'production' or when ENABLE_ENV_DEBUG=true.
// To avoid leaking secrets, this endpoint never returns env values, only boolean presence.
export async function GET() {
  const enabled =
    process.env.ENABLE_ENV_DEBUG === "true" ||
    process.env.NODE_ENV !== "production";
  if (!enabled) {
    return new NextResponse(null, { status: 404 });
  }

  // Default set of server-only keys to check. Can be overridden with ENV_CHECK_KEYS
  const keys = (
    process.env.ENV_CHECK_KEYS ||
    "APPWRITE_API_KEY APPWRITE_ENDPOINT APPWRITE_PROJECT_ID SMTP_HOST SMTP_USER SMTP_PASS"
  )
    .split(/\s+/)
    .filter(Boolean);

  const presence: Record<string, boolean> = {};
  for (const k of keys) {
    presence[k] = !!(process.env[k] && process.env[k] !== "");
  }

  const missing = Object.keys(presence).filter((k) => !presence[k]);

  return NextResponse.json({ present: presence, missing });
}
