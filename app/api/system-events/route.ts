import { NextResponse } from "next/server";
import {
  getAdminDatabases,
  getAdminMessaging,
  Query,
  ID,
} from "@/lib/appwrite/appwrite-admin";
import {
  DATABASE_ID,
  USERS_COLLECTION,
  STOCKS_COLLECTION,
  NOTIFICATIONS_COLLECTION,
  METADATA_COLLECTION,
} from "@/lib/database";
import { sendSystemEmail } from "@/lib/email/mailer";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe";
import { resolvePublicSiteUrl } from "@/lib/site-url";
import type {
  ClientErrorEvent,
  NotificationEmailEvent,
  PremiumStatusChangedEvent,
  MarketDriftCompletedEvent,
  SupportTicketFollowUpEvent,
  TradeConfirmationEmailEvent,
  SystemEventRequest,
  ErrorReportEvent,
} from "@/lib/system-events";

const friendlyDate = (value: string | undefined): string => {
  if (!value) return "soon";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

async function fetchUser(userId: string) {
  try {
    const databases = getAdminDatabases();
    const document = await databases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION,
      userId,
    );
    return {
      email: (document as any).email as string,
      username: (document as any).username as string,
    };
  } catch (error) {
    console.warn("Unable to load user for email notification", error);
    return null;
  }
}

async function fetchStock(stockId: string) {
  try {
    const databases = getAdminDatabases();
    const document = await databases.getDocument(
      DATABASE_ID,
      STOCKS_COLLECTION,
      stockId,
    );
    return {
      imageUrl:
        ((document as any).imageUrl as string | undefined) ||
        ((document as any).animeImageUrl as string | undefined) ||
        "",
      anime: ((document as any).anime as string | undefined) || "",
    };
  } catch (error) {
    console.warn("Unable to load stock for trade email", error);
    return null;
  }
}

async function fetchAdminRecipients(): Promise<string[]> {
  const adminDb = getAdminDatabases();
  const res = await adminDb.listDocuments(DATABASE_ID, USERS_COLLECTION, [
    Query.limit(1000),
  ]);

  const recipients = new Set<string>();
  for (const userDoc of res.documents as any[]) {
    const isAdmin = userDoc.isAdmin === true || userDoc.role === "admin";
    if (isAdmin && userDoc.email) {
      recipients.add(userDoc.email);
    }
  }

  recipients.add("antonioarcher.dev@gmail.com");
  return Array.from(recipients);
}

async function sendAppwriteEmailToUser(
  userId: string,
  subject: string,
  content: string,
  options?: { html?: boolean; scheduledAt?: string },
) {
  const messaging = getAdminMessaging();
  await messaging.createEmail({
    messageId: ID.unique(),
    subject,
    content,
    users: [userId],
    draft: false,
    html: options?.html ?? false,
    scheduledAt: options?.scheduledAt,
  });
}

const DM_EMAIL_DELAY_MINUTES = (() => {
  const raw = Number(process.env.DM_EMAIL_DELAY_MINUTES || 10);
  if (!Number.isFinite(raw) || raw < 1) return 10;
  return Math.floor(raw);
})();

function dmEmailNextAllowedKey(userId: string): string {
  return `dm_email_next_allowed_${userId}`;
}

async function getMetadataValue(key: string): Promise<number | null> {
  try {
    const db = getAdminDatabases();
    const response = await db.listDocuments(DATABASE_ID, METADATA_COLLECTION, [
      Query.equal("key", key),
      Query.limit(1),
    ]);
    if (!response.documents.length) return null;
    const value = Number((response.documents[0] as any).value);
    return Number.isFinite(value) ? value : null;
  } catch (error) {
    console.warn("Failed to read metadata key", key, error);
    return null;
  }
}

async function setMetadataValue(key: string, value: number): Promise<void> {
  const db = getAdminDatabases();
  const response = await db.listDocuments(DATABASE_ID, METADATA_COLLECTION, [
    Query.equal("key", key),
    Query.limit(1),
  ]);
  if (response.documents.length > 0) {
    await db.updateDocument(
      DATABASE_ID,
      METADATA_COLLECTION,
      response.documents[0].$id,
      {
        value,
        updatedAt: new Date().toISOString(),
      },
    );
    return;
  }

  await db.createDocument(DATABASE_ID, METADATA_COLLECTION, ID.unique(), {
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
}

async function shouldScheduleDirectMessageEmail(userId: string): Promise<boolean> {
  const key = dmEmailNextAllowedKey(userId);
  const now = Date.now();
  const nextAllowedAt = await getMetadataValue(key);
  if (nextAllowedAt && now < nextAllowedAt) {
    return false;
  }

  const nextWindow = now + DM_EMAIL_DELAY_MINUTES * 60 * 1000;
  await setMetadataValue(key, nextWindow);
  return true;
}

async function getUnreadDirectMessageCount(userId: string): Promise<number> {
  try {
    const db = getAdminDatabases();
    const response = await db.listDocuments(
      DATABASE_ID,
      NOTIFICATIONS_COLLECTION,
      [
        Query.equal("userId", userId),
        Query.equal("type", "direct_message"),
        Query.equal("read", false),
        Query.limit(1),
      ],
    );
    const total = Number(response.total ?? 0);
    return Number.isFinite(total) ? total : 0;
  } catch (error) {
    console.warn("Failed to load unread direct message count", error);
    return 0;
  }
}

async function handlePasswordChanged(userId: string) {
  const user = await fetchUser(userId);
  if (!user || !user.email) return;

  await sendSystemEmail({
    to: user.email,
    subject: "Your Anime Stock Market password changed",
    text: `Hi ${user.username},\n\nYour password was just updated. If this wasn't you, please reset your password immediately.`,
    html: `<p>Hi ${
      user.username
    },</p><p>Your password was just updated. If this wasn't you, please <a href="${
      process.env.NEXT_PUBLIC_SITE_URL || ""
    }/auth/signin">reset it immediately</a>.</p>`,
  });
}

async function handleUserBanned(userId: string, bannedUntil?: string) {
  const user = await fetchUser(userId);
  if (!user || !user.email) return;

  const until = friendlyDate(bannedUntil);
  await sendSystemEmail({
    to: user.email,
    subject: "Your Anime Stock Market account was banned",
    text: `Hi ${user.username},\n\nYour account has been banned until ${until}. You can reply to this email if you believe this is a mistake.`,
    html: `<p>Hi ${user.username},</p><p>Your account has been banned until <strong>${until}</strong>. You can reply to this email if you believe this is a mistake.</p>`,
  });
}

async function handleDeletionScheduled(userId: string, date?: string) {
  const user = await fetchUser(userId);
  if (!user || !user.email) return;

  const when = friendlyDate(date);
  await sendSystemEmail({
    to: user.email,
    subject: "Your Anime Stock Market account is scheduled for deletion",
    text: `Hi ${user.username},\n\nAn administrator scheduled your account for deletion on ${when}. Your account will remain banned until that time. If you would like to appeal, please reply to this message or submit an in-app appeal.`,
    html: `<p>Hi ${user.username},</p><p>An administrator scheduled your account for deletion on <strong>${when}</strong>. Your account will remain banned until that time. If you would like to appeal, please reply to this message or submit an in-app appeal.</p>`,
  });
}

async function handleAccountDeleted(userId: string, deletedAt?: string) {
  const user = await fetchUser(userId);
  if (!user || !user.email) return;

  const when = friendlyDate(deletedAt);
  await sendSystemEmail({
    to: user.email,
    subject: "Your Anime Stock Market account was deleted",
    text: `Hi ${user.username},\n\nYour account has been permanently deleted on ${when}. Thank you for being part of the community.`,
    html: `<p>Hi ${user.username},</p><p>Your account has been permanently deleted on <strong>${when}</strong>. Thank you for being part of the community.</p>`,
  });
}

async function handleSupportTicketCreated(event: any, siteUrl: string) {
  try {
    const { userId, metadata } = event;
    const subject = metadata?.subject ?? "Support Request";
    const ticketId = metadata?.id;
    const snippet = metadata?.messageSnippet ?? "";
    const contactEmail = metadata?.contactEmail;
    const tag = metadata?.tag;
    const referenceId = metadata?.referenceId;

    // Find submitter (if possible)
    let fromText = "Anonymous";
    if (userId) {
      const submitter = await fetchUser(userId);
      if (submitter) fromText = `${submitter.username} <${submitter.email}>`;
    } else if (contactEmail) {
      fromText = contactEmail;
    }

    const recipients = await fetchAdminRecipients();
    const ticketUrl = ticketId
      ? `${siteUrl}/admin?tab=support&ticket=${ticketId}`
      : `${siteUrl}/admin?tab=support`;

    await Promise.all(
      recipients.map(async (to) => {
        const tagText = tag ? `Type: ${tag}\n` : "";
        const refText = referenceId ? `Reference: ${referenceId}\n` : "";
        const bodyText = `New support ticket submitted\n\nFrom: ${fromText}\nSubject: ${subject}\n${tagText}${refText}\n${snippet}\n\nView: ${ticketUrl}`;
        const bodyHtml = `<p><strong>From:</strong> ${fromText}</p><p><strong>Subject:</strong> ${subject}</p>${
          tag ? `<p><strong>Type:</strong> ${tag}</p>` : ""
        }${
          referenceId ? `<p><strong>Reference:</strong> ${referenceId}</p>` : ""
        }<div style="white-space:pre-wrap">${snippet}</div><p><a href="${ticketUrl}">View ticket in admin</a></p>`;
        try {
          await sendSystemEmail({
            to,
            subject: `Anime Stock Market [Support] ${subject}`,
            text: bodyText,
            html: bodyHtml,
            replyTo: contactEmail,
          });
        } catch (e) {
          console.warn("Failed to send support email to admin", to, e);
        }
      }),
    );

    if (contactEmail) {
      try {
        await sendSystemEmail({
          to: contactEmail,
          subject: `We received your support ticket: ${subject}`,
          text: `Thanks for contacting Anime Stock Market support. Your ticket has been received and queued for review.\n\nTicket ID: ${ticketId || "pending"}\nSubject: ${subject}\n\nWe will reply to this email address as soon as possible.`,
          html: `<p>Thanks for contacting Anime Stock Market support.</p><p>Your ticket has been received and queued for review.</p><p><strong>Ticket ID:</strong> ${
            ticketId || "pending"
          }<br /><strong>Subject:</strong> ${subject}</p><p>We will reply to this email address as soon as possible.</p>`,
        });
      } catch (e) {
        console.warn("Failed to send support acknowledgement email", e);
      }
    }
  } catch (e) {
    console.warn("Error handling support_ticket_created event", e);
  }
}

async function handleSupportTicketFollowUp(
  event: SupportTicketFollowUpEvent,
  siteUrl: string,
) {
  try {
    const metadata = event.metadata;
    if (!metadata?.isAdminReply || !metadata.contactEmail) {
      return;
    }

    const supportUrl = metadata.id
      ? `${siteUrl}/support?ticket=${metadata.id}`
      : `${siteUrl}/support`;

    await sendSystemEmail({
      to: metadata.contactEmail,
      subject: `Support update: ${metadata.subject || "Your ticket"}`,
      text: `Your support ticket has a new response from ${
        metadata.senderDisplay || "an admin"
      }.\n\n${metadata.messageSnippet || ""}\n\nView ticket: ${supportUrl}`,
      html: `<p>Your support ticket has a new response from <strong>${
        metadata.senderDisplay || "an admin"
      }</strong>.</p><div style="white-space:pre-wrap">${
        metadata.messageSnippet || ""
      }</div><p><a href="${supportUrl}">View your support ticket</a></p>`,
    });
  } catch (error) {
    console.warn("Error handling support_ticket_followup event", error);
  }
}

async function handlePremiumStatusChanged(
  event: PremiumStatusChangedEvent,
  siteUrl: string,
) {
  if (!event.metadata?.enabled) return;

  const user = await fetchUser(event.userId);
  if (!user || !user.email) return;

  const premiumUrl = `${siteUrl || ""}/premium`;

  await sendSystemEmail({
    to: user.email,
    subject: "Your Anime Stock Market premium access is active",
    text: `Hi ${user.username},\n\nAn administrator granted you premium access. Visit ${premiumUrl} to explore the new tools and perks. If you didn't expect this change, reply to this email or open support.`,
    html: `<p>Hi ${user.username},</p><p>An administrator granted you premium access. Visit <a href="${premiumUrl}">the premium dashboard</a> to explore the tools and perks. If you didn't expect this change, reply to this email or open support in the app.</p>`,
  });
}

async function handleNotificationEmail(
  event: NotificationEmailEvent,
  siteUrl: string,
) {
  const user = await fetchUser(event.userId);
  if (!user || !user.email) return;

  const isDirectMessage = event.metadata.type === "direct_message";
  const targetPath = isDirectMessage ? "/messages" : "/notifications";
  const targetUrl = `${siteUrl}${targetPath}`;
  const unsubscribeUrl = buildUnsubscribeUrl(
    siteUrl,
    event.userId,
    isDirectMessage ? "all" : "general",
  );
  const trimmedTitle = event.metadata.title?.trim() || "";
  const shortMessage = event.metadata.message || "You have a new alert.";

  if (isDirectMessage) {
    const shouldSchedule = await shouldScheduleDirectMessageEmail(event.userId);
    if (!shouldSchedule) return;

    const unreadCount = await getUnreadDirectMessageCount(event.userId);
    const delayMinutes = DM_EMAIL_DELAY_MINUTES;
    const scheduleAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    const subject =
      unreadCount > 1
        ? `[Anime Stock Market] You have ${unreadCount} unread messages`
        : "[Anime Stock Market] You have a new message";
    const html = `
<p>You have new direct messages waiting in Anime Stock Market.</p>
<p>${shortMessage}</p>
<p><a href="${targetUrl}">Open Messages</a></p>
<p style="font-size:12px;color:#666">
  This reminder was delayed by ${delayMinutes} minute${
      delayMinutes === 1 ? "" : "s"
    } so we do not spam your inbox.
</p>
<p style="font-size:12px;color:#666">Not interested? <a href="${unsubscribeUrl}">Unsubscribe</a></p>
    `.trim();

    await sendAppwriteEmailToUser(event.userId, subject, html, {
      html: true,
      scheduledAt: scheduleAt.toISOString(),
    });
    return;
  }

  const subject = trimmedTitle
    ? `[Anime Stock Market] ${trimmedTitle}`
    : "[Anime Stock Market] New notification";
  const text = `${shortMessage}\n\nView it here: ${targetUrl}`;
  const html = `<p>${shortMessage}</p><p><a href="${targetUrl}">View it in Notifications</a></p><p style="font-size:12px;color:#666">Not interested? <a href="${unsubscribeUrl}">Unsubscribe</a></p>`;

  await sendSystemEmail({
    to: user.email,
    subject,
    text,
    html,
  });
}

async function handleTradeConfirmationEmail(
  event: TradeConfirmationEmailEvent,
  siteUrl: string,
) {
  const user = await fetchUser(event.userId);
  if (!user) return;

  const happenedAt = friendlyDate(event.metadata.happenedAt);
  const isBuy = event.metadata.tradeType === "buy";
  const tradeLabel = isBuy ? "Buy" : "Sell";
  const direction = isBuy ? "spent" : "received";
  const shares = Number(event.metadata.shares) || 0;
  const pricePerShare = Number(event.metadata.pricePerShare) || 0;
  const totalAmount = Number(event.metadata.totalAmount) || 0;
  const portfolioUrl = `${siteUrl}/portfolio`;
  const unsubscribeTradeUrl = buildUnsubscribeUrl(siteUrl, event.userId, "trade");
  const unsubscribeAllUrl = buildUnsubscribeUrl(siteUrl, event.userId, "all");
  const stock = event.metadata.stockId
    ? await fetchStock(event.metadata.stockId)
    : null;
  const imageUrl = stock?.imageUrl || "";

  const subject = `[Anime Stock Market] ${tradeLabel} Confirmed: ${event.metadata.stockName}`;
  const content = `
<p>Hi ${user.username},</p>
<p>Your <strong>${tradeLabel.toLowerCase()}</strong> order was executed successfully.</p>
${imageUrl ? `<p><img src="${imageUrl}" alt="${event.metadata.stockName}" width="320" style="display:block;max-width:100%;height:auto;border-radius:12px" /></p>` : ""}
<ul>
  <li><strong>Stock:</strong> ${event.metadata.stockName}</li>
  ${stock?.anime ? `<li><strong>Series:</strong> ${stock.anime}</li>` : ""}
  <li><strong>Shares:</strong> ${shares.toLocaleString()}</li>
  <li><strong>Price per share:</strong> $${pricePerShare.toFixed(2)}</li>
  <li><strong>Total ${direction}:</strong> $${totalAmount.toFixed(2)}</li>
  <li><strong>Executed at:</strong> ${happenedAt}</li>
</ul>
<p><a href="${portfolioUrl}">View your portfolio</a></p>
<p style="font-size:12px;color:#666">
  <a href="${unsubscribeTradeUrl}">Unsubscribe from trade emails</a> ·
  <a href="${unsubscribeAllUrl}">Unsubscribe from all emails</a>
</p>
  `.trim();

  await sendAppwriteEmailToUser(event.userId, subject, content, { html: true });
}

async function handleClientError(event: ClientErrorEvent) {
  try {
    const recipients = await fetchAdminRecipients();
    const { metadata } = event;
    const subject = "Anime Stock Market client error detected";
    const text = [
      "A client-side error event was captured.",
      "",
      `Message: ${metadata.message}`,
      metadata.source ? `Source: ${metadata.source}` : "",
      metadata.pageUrl ? `Page: ${metadata.pageUrl}` : "",
      metadata.userAgent ? `User Agent: ${metadata.userAgent}` : "",
      metadata.stack ? `Stack:\n${metadata.stack}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const html = `<p>A client-side error event was captured.</p>
<p><strong>Message:</strong> ${metadata.message}</p>
${metadata.source ? `<p><strong>Source:</strong> ${metadata.source}</p>` : ""}
${metadata.pageUrl ? `<p><strong>Page:</strong> ${metadata.pageUrl}</p>` : ""}
${metadata.userAgent ? `<p><strong>User Agent:</strong> ${metadata.userAgent}</p>` : ""}
${
  metadata.stack
    ? `<p><strong>Stack</strong></p><pre style="white-space:pre-wrap">${metadata.stack}</pre>`
    : ""
}`;

    await Promise.all(
      recipients.map(async (to) => {
        try {
          await sendSystemEmail({ to, subject, text, html });
        } catch (error) {
          console.warn("Failed to send client error email", to, error);
        }
      }),
    );
  } catch (error) {
    console.warn("Error handling client_error event", error);
  }
}

async function handleErrorReport(event: any, siteUrl: string) {
  try {
    const recipients = await fetchAdminRecipients();
    const { metadata } = event;

    const ticketUrl = `${siteUrl}/admin?tab=support&ticket=${metadata.id}`;
    const subject = `🚨 ERROR REPORT: ${metadata.errorType || "Unknown"} on ${new URL(metadata.pageUrl || "").pathname || "/"}`;

    const text = [
      "A user reported an error:",
      "",
      `Error Type: ${metadata.errorType || "Unknown"}`,
      `Error Message: ${metadata.errorMessage || "N/A"}`,
      `Page: ${metadata.pageUrl || "N/A"}`,
      metadata.affectedFeature ? `Affected Feature: ${metadata.affectedFeature}` : "",
      `Reported At: ${metadata.timestamp || new Date().toISOString()}`,
      "",
      `View Support Ticket: ${ticketUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
<p>⚠️ A user reported an error:</p>
<p><strong>Error Type:</strong> ${metadata.errorType || "Unknown"}</p>
<p><strong>Error Message:</strong> ${metadata.errorMessage || "N/A"}</p>
<p><strong>Page:</strong> <a href="${metadata.pageUrl || "#"}">${metadata.pageUrl || "N/A"}</a></p>
${metadata.affectedFeature ? `<p><strong>Affected Feature:</strong> ${metadata.affectedFeature}</p>` : ""}
<p><strong>Reported At:</strong> ${metadata.timestamp || new Date().toISOString()}</p>
<p><a href="${ticketUrl}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">View Support Ticket</a></p>
    `.trim();

    await Promise.all(
      recipients.map(async (to) => {
        try {
          await sendSystemEmail({ to, subject, text, html });
        } catch (error) {
          console.warn("Failed to send error report email", to, error);
        }
      }),
    );
  } catch (error) {
    console.warn("Error handling error_report event", error);
  }
}

async function handleMarketDriftCompleted(event: MarketDriftCompletedEvent) {
  try {
    const { metadata } = event;
    const stocksProcessed = metadata?.stocksProcessed || 0;
    const totalStocks = metadata?.totalStocks || 0;
    const duration = metadata?.duration || 0;

    // Create a system-wide notification for all admin users
    const databases = getAdminDatabases();
    const adminUsers = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION,
      [Query.equal("role", "admin")],
    );

    // Create notification for each admin user
    await Promise.all(
      adminUsers.documents.map(async (admin) => {
        try {
          await databases.createDocument(
            DATABASE_ID,
            NOTIFICATIONS_COLLECTION,
            ID.unique(),
            {
              userId: admin.$id,
              type: "system",
              title: "Market Drift Completed",
              message: `Market drift completed successfully. Updated ${stocksProcessed}/${totalStocks} stocks in ${duration}ms.`,
              read: false,
              createdAt: new Date().toISOString(),
              metadata: {
                stocksProcessed,
                totalStocks,
                duration,
                timestamp: metadata?.timestamp,
              },
            },
          );
        } catch (e) {
          console.warn("Failed to create notification for admin", admin.$id, e);
        }
      }),
    );

    console.log(
      `Market drift notification sent to ${adminUsers.documents.length} admin users`,
    );
  } catch (error) {
    console.error("Error handling market drift completed event", error);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SystemEventRequest | null;
    const siteUrl = resolvePublicSiteUrl(req);
    if (!body || !body.type) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const userIdRequiredEvents = new Set([
      "password_changed",
      "user_banned",
      "deletion_scheduled",
      "account_deleted",
      "premium_status_changed",
      "notification_email",
      "trade_confirmation_email",
    ]);
    if (userIdRequiredEvents.has(body.type) && !body.userId) {
      return NextResponse.json(
        { error: "Invalid payload: userId required" },
        { status: 400 },
      );
    }

    switch (body.type) {
      case "password_changed":
        await handlePasswordChanged(body.userId);
        break;
      case "user_banned":
        await handleUserBanned(body.userId, body.metadata?.bannedUntil);
        break;
      case "deletion_scheduled":
        await handleDeletionScheduled(body.userId, body.metadata?.deletionDate);
        break;
      case "account_deleted":
        await handleAccountDeleted(body.userId, body.metadata?.deletedAt);
        break;
      case "support_ticket_created":
        // email all admins with ticket details
        await handleSupportTicketCreated(body as any, siteUrl);
        break;
      case "support_ticket_followup":
        await handleSupportTicketFollowUp(
          body as SupportTicketFollowUpEvent,
          siteUrl,
        );
        break;
      case "premium_status_changed":
        await handlePremiumStatusChanged(
          body as PremiumStatusChangedEvent,
          siteUrl,
        );
        break;
      case "notification_email":
        await handleNotificationEmail(body as NotificationEmailEvent, siteUrl);
        break;
      case "trade_confirmation_email":
        await handleTradeConfirmationEmail(
          body as TradeConfirmationEmailEvent,
          siteUrl,
        );
        break;
      case "market_drift_completed":
        await handleMarketDriftCompleted(body as MarketDriftCompletedEvent);
        break;
      case "client_error":
        await handleClientError(body as ClientErrorEvent);
        break;
      case "error_report":
        await handleErrorReport(body as ErrorReportEvent, siteUrl);
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported event" },
          { status: 400 },
        );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to process system event", error);
    return NextResponse.json(
      { error: "Failed to process system event" },
      { status: 500 },
    );
  }
}
