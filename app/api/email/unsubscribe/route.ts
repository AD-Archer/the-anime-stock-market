import { NextResponse } from "next/server";
import { getAdminDatabases } from "@/lib/appwrite/appwrite-admin";
import { DATABASE_ID, USERS_COLLECTION } from "@/lib/database";
import {
  preferenceToUserFields,
  verifyUnsubscribeToken,
} from "@/lib/email/unsubscribe";
import { resolvePublicSiteUrl } from "@/lib/site-url";

function renderHtml(title: string, message: string, linkHref: string): string {
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #f7f7f7; color: #111; }
      .wrap { max-width: 560px; margin: 48px auto; background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; }
      h1 { margin: 0 0 12px; font-size: 22px; }
      p { margin: 0 0 16px; line-height: 1.5; }
      a { color: #2563eb; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <h1>${title}</h1>
      <p>${message}</p>
      <p><a href="${linkHref}">Back to Anime Stock Market</a></p>
    </main>
  </body>
</html>
  `.trim();
}

export async function GET(req: Request) {
  const siteUrl = resolvePublicSiteUrl(req);
  const fallbackLink = `${siteUrl}/market`;
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) {
      return new NextResponse(
        renderHtml(
          "Invalid unsubscribe link",
          "This unsubscribe link is missing required information.",
          fallbackLink
        ),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const payload = verifyUnsubscribeToken(token);
    if (!payload) {
      return new NextResponse(
        renderHtml(
          "Unsubscribe link expired",
          "This unsubscribe link is invalid or has expired. Please request a new email and try again.",
          fallbackLink
        ),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const updates = preferenceToUserFields(payload.preference);
    if (Object.keys(updates).length === 0) {
      return new NextResponse(
        renderHtml(
          "Unsupported preference",
          "This unsubscribe preference is not supported.",
          fallbackLink
        ),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const databases = getAdminDatabases();
    await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION,
      payload.userId,
      updates
    );

    const settingsLink = `${siteUrl}/market`;
    return new NextResponse(
      renderHtml(
        "You are unsubscribed",
        "Your email preferences have been updated successfully. You can change them again anytime in your profile settings.",
        settingsLink
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    console.error("Email unsubscribe failed:", error);
    return new NextResponse(
      renderHtml(
        "Unsubscribe failed",
        "We could not process this request right now. Please try again later.",
        fallbackLink
      ),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
