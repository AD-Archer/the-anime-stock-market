import { NextRequest, NextResponse } from "next/server";
import {
  getAdminDatabases,
  getAdminMessaging,
  ID,
  Query,
} from "@/lib/appwrite/appwrite-admin";
import { DATABASE_ID, USERS_COLLECTION } from "@/lib/database";
import { sendSystemEmail } from "@/lib/email/mailer";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe";
import { buildPerformanceCardUrl } from "@/lib/email/performance-card";
import { resolvePublicSiteUrl } from "@/lib/site-url";

type EmailTemplate =
  | "trade_confirmation"
  | "weekly_performance"
  | "weekly_return"
  | "custom";

const isAdminUser = async (adminUserId: string): Promise<boolean> => {
  const db = getAdminDatabases();
  try {
    const adminDoc = await db.getDocument(DATABASE_ID, USERS_COLLECTION, adminUserId);
    return (adminDoc as any).isAdmin === true;
  } catch {
    return false;
  }
};

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const deriveDisplayNameFromEmail = (email: string): string => {
  const localPart = email.split("@")[0] || "Trader";
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();
  return cleaned || "Trader";
};

const htmlToText = (html: string): string =>
  html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const defaultHtmlForTemplate = (
  template: EmailTemplate,
  siteUrl: string,
  userId: string | null,
  username: string
) => {
  const portfolioUrl = `${siteUrl}/portfolio`;
  const marketUrl = `${siteUrl}/market`;
  const canUnsubscribe = !!userId;
  const unsubTrade = canUnsubscribe
    ? buildUnsubscribeUrl(siteUrl, userId!, "trade")
    : "";
  const unsubPerf = canUnsubscribe
    ? buildUnsubscribeUrl(siteUrl, userId!, "weekly_performance")
    : "";
  const unsubReturn = canUnsubscribe
    ? buildUnsubscribeUrl(siteUrl, userId!, "weekly_return")
    : "";
  const unsubAll = canUnsubscribe
    ? buildUnsubscribeUrl(siteUrl, userId!, "all")
    : "";
  const performanceCardUrl = buildPerformanceCardUrl(siteUrl, {
    name: username,
    portfolioValue: 12430.12,
    pnl: 422.1,
    pnlPct: 3.51,
    topMovers: [
      { name: "Asuka Langley", pnl: 210 },
      { name: "Lelouch Lamperouge", pnl: 122.1 },
      { name: "Spike Spiegel", pnl: 90 },
    ],
    generatedAt: new Date().toISOString(),
  });

  switch (template) {
    case "trade_confirmation":
      return {
        subject: "[Anime Stock Market] Buy Confirmed: Demo Character",
        html: `
<p>Hi ${username},</p>
<p>Your buy order was executed successfully.</p>
<p style="margin:0 0 12px">
  <span style="display:inline-block;padding:10px 14px;background:#0f172a;color:#e2e8f0;border-radius:999px;font-size:12px">
    Character Snapshot
  </span>
</p>
<div style="max-width:320px;height:180px;border-radius:12px;background:linear-gradient(135deg,#1d4ed8,#0f172a);display:flex;align-items:flex-end;padding:14px;color:#fff;font-weight:700">
  Demo Character
</div>
<ul>
  <li><strong>Stock:</strong> Demo Character</li>
  <li><strong>Shares:</strong> 25</li>
  <li><strong>Price per share:</strong> $8.40</li>
  <li><strong>Total spent:</strong> $210.00</li>
</ul>
<p><a href="${portfolioUrl}">View your portfolio</a></p>
${canUnsubscribe ? `<p style="font-size:12px;color:#666"><a href="${unsubTrade}">Unsubscribe from trade emails</a> · <a href="${unsubAll}">Unsubscribe from all emails</a></p>` : `<p style="font-size:12px;color:#666">Direct test email sent to a typed address.</p>`}
        `.trim(),
      };
    case "weekly_performance":
      return {
        subject: "[Anime Stock Market] Your weekly portfolio performance digest",
        html: `
<p>Hi ${username},</p>
<p>Here is your weekly Anime Stock Market performance digest.</p>
<p>
  <img
    src="${performanceCardUrl}"
    alt="Weekly performance card"
    width="640"
    style="display:block;width:100%;max-width:640px;height:auto;border:0;border-radius:14px"
  />
</p>
<p><strong>Portfolio value:</strong> $12,430.12 (+$422.10 / +3.51%)</p>
<ul>
  <li><strong>Asuka Langley:</strong> +$210.00</li>
  <li><strong>Lelouch Lamperouge:</strong> +$122.10</li>
  <li><strong>Spike Spiegel:</strong> +$90.00</li>
</ul>
<p><a href="${portfolioUrl}">Return to the app and review your positions</a>.</p>
${canUnsubscribe ? `<p style="font-size:12px;color:#666"><a href="${unsubPerf}">Unsubscribe from performance emails</a> · <a href="${unsubReturn}">Unsubscribe from return reminders</a> · <a href="${unsubAll}">Unsubscribe from all emails</a></p>` : `<p style="font-size:12px;color:#666">Direct test email sent to a typed address.</p>`}
        `.trim(),
      };
    case "weekly_return":
      return {
        subject: "[Anime Stock Market] Weekly reminder: come back to the app",
        html: `
<p>Hi ${username},</p>
<p>The market has moved this week and your portfolio is waiting.</p>
<p>
  <img
    src="${performanceCardUrl}"
    alt="Your portfolio snapshot"
    width="640"
    style="display:block;width:100%;max-width:640px;height:auto;border:0;border-radius:14px"
  />
</p>
<p><a href="${portfolioUrl}">Check your holdings</a> or <a href="${marketUrl}">discover trending stocks</a>.</p>
${canUnsubscribe ? `<p style="font-size:12px;color:#666"><a href="${unsubReturn}">Unsubscribe from return reminders</a> · <a href="${unsubAll}">Unsubscribe from all emails</a></p>` : `<p style="font-size:12px;color:#666">Direct test email sent to a typed address.</p>`}
        `.trim(),
      };
    case "custom":
    default:
      return {
        subject: "Test email from Anime Stock Market admin",
        html: `<p>Hi ${username},</p><p>This is a custom test email preview.</p>`,
      };
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const adminUserId = String(body?.adminUserId || "");
    const targetUserId = String(body?.targetUserId || "").trim();
    const targetEmailInput = String(body?.targetEmail || "").trim();
    const template = String(body?.template || "custom") as EmailTemplate;
    const customSubject = String(body?.subject || "");
    const customHtml = String(body?.html || "");

    if (!adminUserId || (!targetUserId && !targetEmailInput)) {
      return NextResponse.json(
        {
          error: "adminUserId and either targetUserId or targetEmail are required",
        },
        { status: 400 }
      );
    }

    const adminAllowed = await isAdminUser(adminUserId);
    if (!adminAllowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const databases = getAdminDatabases();
    let resolvedUserId: string | null = null;
    let resolvedEmail = "";
    let username = "Trader";

    if (targetUserId) {
      const targetDoc = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION,
        targetUserId
      );
      resolvedUserId = targetDoc.$id;
      resolvedEmail = String((targetDoc as any).email || "").trim();
      username =
        String((targetDoc as any).displayName || "").trim() ||
        String((targetDoc as any).username || "").trim() ||
        "Trader";
    } else {
      if (!isValidEmail(targetEmailInput)) {
        return NextResponse.json(
          { error: "Please enter a valid recipient email address" },
          { status: 400 }
        );
      }

      resolvedEmail = targetEmailInput.toLowerCase();
      username = deriveDisplayNameFromEmail(resolvedEmail);

      const matchedUsers = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION,
        [Query.equal("email", resolvedEmail), Query.limit(1)]
      );
      const matchedUser = matchedUsers.documents[0] as any;
      if (matchedUser) {
        resolvedUserId = matchedUser.$id;
        username =
          String(matchedUser.displayName || "").trim() ||
          String(matchedUser.username || "").trim() ||
          username;
      }
    }

    const siteUrl = resolvePublicSiteUrl(req);

    const built = defaultHtmlForTemplate(
      template,
      siteUrl,
      resolvedUserId,
      username
    );
    const subject =
      template === "custom" && customSubject.trim().length > 0
        ? customSubject.trim()
        : built.subject;
    const html =
      template === "custom" && customHtml.trim().length > 0
        ? customHtml.trim()
        : built.html;

    let deliveryMethod: "appwrite_user" | "smtp_email";
    if (resolvedUserId) {
      const messaging = getAdminMessaging();
      await messaging.createEmail({
        messageId: ID.unique(),
        subject,
        content: html,
        users: [resolvedUserId],
        html: true,
        draft: false,
      });
      deliveryMethod = "appwrite_user";
    } else {
      await sendSystemEmail({
        to: resolvedEmail,
        subject,
        html,
        text: htmlToText(html),
      });
      deliveryMethod = "smtp_email";
    }

    return NextResponse.json({
      success: true,
      subject,
      previewHtml: html,
      template,
      recipientEmail: resolvedEmail,
      deliveryMethod,
    });
  } catch (error) {
    console.error("Failed to send admin test email:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}
