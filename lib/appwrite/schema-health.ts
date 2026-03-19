import "server-only";

import { ID, Query, getAdminDatabases } from "@/lib/appwrite/appwrite-admin";
import {
  DATABASE_ID,
  METADATA_COLLECTION,
  USERS_COLLECTION,
} from "@/lib/database";
import { sendSystemEmail } from "@/lib/email/mailer";

type CollectionMismatch = {
  collectionId: string;
  missingAttributes: string[];
  error?: string;
};

const REQUIRED_COLLECTION_ATTRIBUTES: Record<string, string[]> = {
  users: [
    "username",
    "email",
    "displayName",
    "displaySlug",
    "hasPassword",
    "balance",
    "isAdmin",
    "isBanned",
    "createdAt",
    "avatarUrl",
    "bannedUntil",
    "showNsfw",
    "showSpoilers",
    "theme",
    "isPortfolioPublic",
    "hideTransactions",
    "anonymousTransactions",
    "emailNotificationsEnabled",
    "directMessageEmailNotifications",
    "tradeEmailNotifications",
    "dailyTradeDigestEmailNotifications",
    "weeklyPerformanceEmailNotifications",
    "weeklyReturnToAppEmailNotifications",
    "allowProfanityInDirectMessages",
    "pendingDeletionAt",
    "premiumMeta",
    "lastDailyRewardClaim",
    "termsAcceptedVersion",
    "termsAcceptedAt",
    "privacyAcceptedVersion",
    "privacyAcceptedAt",
  ],
  stocks: [
    "characterName",
    "characterSlug",
    "anilistCharacterId",
    "anime",
    "mediaType",
    "currentPrice",
    "createdBy",
    "createdAt",
    "imageUrl",
    "description",
    "totalShares",
    "availableShares",
  ],
  transactions: [
    "userId",
    "stockId",
    "type",
    "shares",
    "pricePerShare",
    "totalAmount",
    "timestamp",
  ],
  portfolios: ["userId", "stockId", "shares", "averageBuyPrice"],
  price_history: ["stockId", "price", "timestamp"],
  daily_rewards: [
    "userId",
    "lastClaimDate",
    "currentStreak",
    "longestStreak",
    "totalClaimed",
    "totalAmount",
  ],
  directional_bets: [
    "userId",
    "stockId",
    "type",
    "amount",
    "entryPrice",
    "status",
    "createdAt",
    "expiresAt",
  ],
  admin_action_logs: [
    "action",
    "performedBy",
    "targetUserId",
    "metadata",
    "createdAt",
  ],
  metadata: ["key", "value", "updatedAt"],
};

const DEFAULT_DEDUPE_HOURS = 24;

function getDedupeHours(): number {
  const value = Number(process.env.SCHEMA_ALERT_DEDUPE_HOURS || "");
  if (!Number.isFinite(value) || value < 1) return DEFAULT_DEDUPE_HOURS;
  return Math.floor(value);
}

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

function parseConfiguredRecipients(): string[] {
  const raw =
    process.env.SCHEMA_ALERT_EMAILS || process.env.ADMIN_ALERT_EMAIL || "";
  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split(",")
        .map((value) => normalizeEmail(value))
        .filter(Boolean)
    )
  );
}

async function fetchAdminRecipientsFromDatabase(): Promise<string[]> {
  try {
    const databases = getAdminDatabases();
    const response = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION, [
      Query.limit(1000),
    ]);

    const recipients = new Set<string>();
    for (const document of response.documents as any[]) {
      if ((document.isAdmin === true || document.role === "admin") && document.email) {
        recipients.add(normalizeEmail(String(document.email)));
      }
    }
    return Array.from(recipients);
  } catch (error) {
    console.warn("[schema-health] Failed to fetch admin recipients", error);
    return [];
  }
}

function buildSignature(mismatches: CollectionMismatch[]): string {
  return mismatches
    .map((mismatch) => {
      const missing = [...mismatch.missingAttributes].sort().join(",");
      return `${mismatch.collectionId}|${missing}|${mismatch.error || ""}`;
    })
    .sort()
    .join(";");
}

function hashSignature(signature: string): string {
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    hash = (hash << 5) - hash + signature.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function shouldSkipDueToRecentAlert(signatureKey: string): Promise<boolean> {
  try {
    const databases = getAdminDatabases();
    const response = await databases.listDocuments(DATABASE_ID, METADATA_COLLECTION, [
      Query.equal("key", signatureKey),
      Query.limit(1),
    ]);
    if (!response.documents.length) return false;

    const document = response.documents[0] as any;
    const updatedAt = new Date(String(document.updatedAt || ""));
    if (Number.isNaN(updatedAt.getTime())) return false;

    const dedupeHours = getDedupeHours();
    const elapsed = Date.now() - updatedAt.getTime();
    return elapsed < dedupeHours * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

async function markAlertSent(signatureKey: string): Promise<void> {
  try {
    const databases = getAdminDatabases();
    const now = new Date();
    const payload = {
      key: signatureKey,
      value: now.getTime(),
      updatedAt: now.toISOString(),
    };
    const existing = await databases.listDocuments(DATABASE_ID, METADATA_COLLECTION, [
      Query.equal("key", signatureKey),
      Query.limit(1),
    ]);
    if (existing.documents.length > 0) {
      await databases.updateDocument(
        DATABASE_ID,
        METADATA_COLLECTION,
        existing.documents[0].$id,
        payload
      );
      return;
    }
    await databases.createDocument(
      DATABASE_ID,
      METADATA_COLLECTION,
      ID.unique(),
      payload
    );
  } catch (error) {
    console.warn("[schema-health] Failed to store alert dedupe marker", error);
  }
}

async function checkCollection(
  collectionId: string,
  requiredAttributes: string[]
): Promise<CollectionMismatch | null> {
  try {
    const databases = getAdminDatabases();
    const attributesResponse = await databases.listAttributes(
      DATABASE_ID,
      collectionId
    );
    const present = new Set(
      (attributesResponse.attributes as any[]).map((attribute) =>
        String(attribute.key)
      )
    );
    const missingAttributes = requiredAttributes.filter(
      (attribute) => !present.has(attribute)
    );
    if (missingAttributes.length === 0) return null;
    return { collectionId, missingAttributes };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      collectionId,
      missingAttributes: requiredAttributes,
      error: message,
    };
  }
}

async function runSchemaHealthCheck(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.SCHEMA_HEALTH_ALERTS_ENABLED === "false") return;
  if (!process.env.APPWRITE_API_KEY) return;
  if (!DATABASE_ID) return;

  const checks = await Promise.all(
    Object.entries(REQUIRED_COLLECTION_ATTRIBUTES).map(([collectionId, attrs]) =>
      checkCollection(collectionId, attrs)
    )
  );
  const mismatches = checks.filter((result): result is CollectionMismatch =>
    Boolean(result)
  );
  if (mismatches.length === 0) return;

  const signature = buildSignature(mismatches);
  const signatureKey = `schema_alert_${hashSignature(signature)}`;
  if (await shouldSkipDueToRecentAlert(signatureKey)) return;

  const recipients = Array.from(
    new Set([
      ...parseConfiguredRecipients(),
      ...(await fetchAdminRecipientsFromDatabase()),
    ])
  );
  if (recipients.length === 0) {
    console.warn(
      "[schema-health] Schema mismatch detected but no admin recipients configured."
    );
    return;
  }

  const mismatchLines = mismatches.map((mismatch) => {
    const missing = mismatch.missingAttributes.join(", ");
    return mismatch.error
      ? `- ${mismatch.collectionId}: ${missing}\n  error: ${mismatch.error}`
      : `- ${mismatch.collectionId}: ${missing}`;
  });

  const subject = `[Production Alert] Appwrite schema mismatch (${DATABASE_ID})`;
  const text = [
    "A production schema mismatch was detected in Appwrite.",
    "",
    `Database ID: ${DATABASE_ID}`,
    `Time: ${new Date().toISOString()}`,
    "",
    "Missing attributes by collection:",
    ...mismatchLines,
    "",
    "Run `pnpm appwrite:setup` against the production database to reconcile schema.",
  ].join("\n");

  await Promise.all(
    recipients.map(async (to) => {
      try {
        await sendSystemEmail({ to, subject, text });
      } catch (error) {
        console.warn("[schema-health] Failed to send schema alert email", to, error);
      }
    })
  );

  await markAlertSent(signatureKey);
}

declare global {
  // eslint-disable-next-line no-var
  var __schemaHealthCheckPromise: Promise<void> | undefined;
}

export function startSchemaHealthMonitor(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (globalThis.__schemaHealthCheckPromise) return;

  globalThis.__schemaHealthCheckPromise = runSchemaHealthCheck().catch((error) => {
    console.warn("[schema-health] monitor failed", error);
  });
}

