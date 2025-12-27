import { NextResponse } from "next/server";
import { getAdminDatabases, Query } from "@/lib/appwrite/appwrite-admin";
import { DATABASE_ID, USERS_COLLECTION } from "@/lib/database";
import { sendSystemEmail } from "@/lib/email/mailer";
import type {
  NotificationEmailEvent,
  PremiumStatusChangedEvent,
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
      userId
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

async function handleSupportTicketCreated(event: any) {
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

    const adminDb = getAdminDatabases();
    const res = await adminDb.listDocuments(DATABASE_ID, USERS_COLLECTION, [
      Query.equal("isAdmin", true),
      Query.limit(500),
    ]);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const ticketUrl = ticketId
      ? `${siteUrl}/admin?tab=support&ticket=${ticketId}`
      : `${siteUrl}/admin?tab=support`;

    // Collect recipients (admins + fallback address)
    const recipients = new Set<string>();
    (res.documents || []).forEach((admin: any) => {
      if (admin.email) recipients.add(admin.email);
    });
    // Always notify this address as requested
    recipients.add("antonioarcher.dev@gmail.com");

    await Promise.all(
      Array.from(recipients).map(async (to) => {
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
      })
    );
  } catch (e) {
    console.warn("Error handling support_ticket_created event", e);
  }
}

async function handlePremiumStatusChanged(event: PremiumStatusChangedEvent) {
  if (!event.metadata?.enabled) return;

  const user = await fetchUser(event.userId);
  if (!user || !user.email) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const premiumUrl = `${siteUrl || ""}/premium`;

  await sendSystemEmail({
    to: user.email,
    subject: "Your Anime Stock Market premium access is active",
    text: `Hi ${user.username},\n\nAn administrator granted you premium access. Visit ${premiumUrl} to explore the new tools and perks. If you didn't expect this change, reply to this email or open support.`,
    html: `<p>Hi ${user.username},</p><p>An administrator granted you premium access. Visit <a href="${premiumUrl}">the premium dashboard</a> to explore the tools and perks. If you didn't expect this change, reply to this email or open support in the app.</p>`,
  });
}

async function handleNotificationEmail(event: NotificationEmailEvent) {
  const user = await fetchUser(event.userId);
  if (!user || !user.email) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SystemEventRequest | null;
    if (!body || !body.userId || !body.type) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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
        await handleSupportTicketCreated(body as any);
        break;
      case "premium_status_changed":
        await handlePremiumStatusChanged(body as PremiumStatusChangedEvent);
        break;
      case "notification_email":
        await handleNotificationEmail(body as NotificationEmailEvent);
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported event" },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to process system event", error);
    return NextResponse.json(
      { error: "Failed to process system event" },
      { status: 500 }
    );
  }
}
