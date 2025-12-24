import { NextResponse } from "next/server";
import { getAdminDatabases } from "@/lib/appwrite/appwrite-admin";
import { DATABASE_ID, USERS_COLLECTION } from "@/lib/database";
import { sendSystemEmail } from "@/lib/email/mailer";
import type { SystemEventRequest } from "@/lib/system-events";

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
    const document = await databases.getDocument(DATABASE_ID, USERS_COLLECTION, userId);
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
    subject: "Your Anime Stock Exchange password changed",
    text: `Hi ${user.username},\n\nYour password was just updated. If this wasn't you, please reset your password immediately.`,
    html: `<p>Hi ${user.username},</p><p>Your password was just updated. If this wasn't you, please <a href="${process.env.NEXT_PUBLIC_SITE_URL || ""}/auth/signin">reset it immediately</a>.</p>`,
  });
}

async function handleUserBanned(userId: string, bannedUntil?: string) {
  const user = await fetchUser(userId);
  if (!user || !user.email) return;

  const until = friendlyDate(bannedUntil);
  await sendSystemEmail({
    to: user.email,
    subject: "Your Anime Stock Exchange account was banned",
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
    subject: "Your Anime Stock Exchange account is scheduled for deletion",
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
    subject: "Your Anime Stock Exchange account was deleted",
    text: `Hi ${user.username},\n\nYour account has been permanently deleted on ${when}. Thank you for being part of the community.`,
    html: `<p>Hi ${user.username},</p><p>Your account has been permanently deleted on <strong>${when}</strong>. Thank you for being part of the community.</p>`,
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
      default:
        return NextResponse.json({ error: "Unsupported event" }, { status: 400 });
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
