import { NextResponse } from "next/server";
import { getAdminDatabases, Query, ID } from "@/lib/appwrite/appwrite-admin";
import {
  DATABASE_ID,
  USERS_COLLECTION,
  NOTIFICATIONS_COLLECTION,
} from "@/lib/database";
import { sendSystemEmail } from "@/lib/email/mailer";
import { resolvePublicSiteUrl } from "@/lib/site-url";
import type {
  ClientErrorEvent,
  NotificationEmailEvent,
  PremiumStatusChangedEvent,
  MarketDriftCompletedEvent,
  SupportTicketFollowUpEvent,
  SystemEventRequest,
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
  const trimmedTitle = event.metadata.title?.trim() || "";
  const subject = trimmedTitle
    ? `[Anime Stock Market] ${trimmedTitle}`
    : isDirectMessage
      ? "[Anime Stock Market] New direct message"
      : "[Anime Stock Market] New notification";
  const shortMessage = event.metadata.message || "You have a new alert.";
  const text = `${shortMessage}\n\nView it here: ${targetUrl}`;
  const html = `<p>${shortMessage}</p><p><a href="${targetUrl}">View it in ${
    isDirectMessage ? "Messages" : "Notifications"
  }</a></p>`;

  await sendSystemEmail({
    to: user.email,
    subject,
    text,
    html,
  });
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
      case "market_drift_completed":
        await handleMarketDriftCompleted(body as MarketDriftCompletedEvent);
        break;
      case "client_error":
        await handleClientError(body as ClientErrorEvent);
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
