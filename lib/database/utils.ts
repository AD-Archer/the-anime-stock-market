import { ID, type Models } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type {
  User,
  Stock,
  Transaction,
  PriceHistory,
  Portfolio,
  Comment,
  BuybackOffer,
  Notification,
  Report,
  ContentTag,
  CommentSnapshot,
  Message,
  Appeal,
  AdminActionLog,
  Award,
  DailyReward,
  SupportTicket,
} from "../types";

// Prefer non-public variable name, fallback to NEXT_PUBLIC_* for backwards compatibility
export const DATABASE_ID =
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  "";

export const isDatabaseConfigured = (): boolean => Boolean(DATABASE_ID);

/**
 * Get database id at runtime. Priority:
 * 1) Server-side APPWRITE_DATABASE_ID
 * 2) NEXT_PUBLIC_APPWRITE_DATABASE_ID (client-visible)
 * 3) Runtime config provided by /api/appwrite-config (window.__APPWRITE_CONFIG.databaseId)
 */
export const getRuntimeDatabaseId = (): string | undefined => {
  if (DATABASE_ID) return DATABASE_ID;
  if (typeof window !== "undefined") {
    // runtime config populated by client init
    const cfg = (window as any).__APPWRITE_CONFIG;
    if (cfg && typeof cfg.databaseId === "string" && cfg.databaseId.trim()) {
      return cfg.databaseId;
    }
  }
  return undefined;
};

export const ensureDatabaseIdAvailable = (): string => {
  const id = getRuntimeDatabaseId();
  if (!id) {
    throw new Error(
      "Appwrite database ID is not available on the client.\n" +
        "To allow direct client access, set NEXT_PUBLIC_APPWRITE_DATABASE_ID or set EXPOSE_APPWRITE_DATABASE_ID=true.\n" +
        "Alternatively, use server-side API endpoints that do not require exposing the DB id."
    );
  }
  return id;
};

// Collections
export const USERS_COLLECTION = "users";
export const STOCKS_COLLECTION = "stocks";
export const TRANSACTIONS_COLLECTION = "transactions";
export const PORTFOLIOS_COLLECTION = "portfolios";
export const PRICE_HISTORY_COLLECTION = "price_history";
export const COMMENTS_COLLECTION = "comments";
export const BUYBACK_OFFERS_COLLECTION = "buyback_offers";
export const NOTIFICATIONS_COLLECTION = "notifications";
export const REPORTS_COLLECTION = "reports";
export const MESSAGES_COLLECTION = "messages";
export const APPEALS_COLLECTION = "appeals";
export const ADMIN_ACTION_LOGS_COLLECTION = "admin_action_logs";
export const AWARDS_COLLECTION = "awards";
export const FRIENDS_COLLECTION = "friends";
export const SUPPORTS_COLLECTION = "support_tickets";
// Daily rewards collection - will gracefully fail if not created
export const DAILY_REWARDS_COLLECTION =
  process.env.NEXT_PUBLIC_DAILY_REWARDS_COLLECTION || "daily_rewards";

export type AppwriteDocument = Models.Document;
type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const docValue = (doc: AppwriteDocument, key: string): unknown =>
  (doc as any)[key];

export const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
};

export const toStringOr = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return fallback;
  return String(value);
};

export const toOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return toStringOr(value);
};

export const toNumberOr = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  return toNumberOr(value);
};

export const toBooleanOr = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

export const toOptionalDate = (value: unknown): Date | undefined => {
  if (value === undefined || value === null) return undefined;
  return toDate(value);
};

export const toArrayOr = <T>(value: unknown, fallback: T[] = []): T[] => {
  if (Array.isArray(value)) return value;
  return fallback;
};

export const normalizePayload = <T extends object>(
  payload: T
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(payload as Record<string, unknown>)
      .filter(([key]) => key !== "id") // Filter out 'id' since Appwrite uses $id
      .map(([key, value]) => [
        key,
        value instanceof Date ? value.toISOString() : value,
      ])
  );

export const mapUser = (doc: AppwriteDocument): User => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  username: toStringOr(docValue(doc, "username")),
  displayName: toStringOr(
    docValue(doc, "displayName"),
    toStringOr(docValue(doc, "username"))
  ),
  displaySlug: toStringOr(
    docValue(doc, "displaySlug"),
    toStringOr(docValue(doc, "username"))
  ),
  email: toStringOr(docValue(doc, "email")),
  balance: toNumberOr(docValue(doc, "balance"), 0),
  isAdmin: toBooleanOr(docValue(doc, "isAdmin")),
  isBanned: toBooleanOr(docValue(doc, "isBanned"), false),
  createdAt: toDate(docValue(doc, "createdAt") ?? doc.$createdAt),
  avatarUrl: toOptionalString(docValue(doc, "avatarUrl")),
  bannedUntil: docValue(doc, "bannedUntil")
    ? toDate(docValue(doc, "bannedUntil"))
    : null,
  showNsfw: toBooleanOr(docValue(doc, "showNsfw"), true),
  showSpoilers: toBooleanOr(docValue(doc, "showSpoilers"), true),
  isPortfolioPublic: toBooleanOr(docValue(doc, "isPortfolioPublic"), false),
  hideTransactions: toBooleanOr(docValue(doc, "hideTransactions"), false),
  anonymousTransactions: toBooleanOr(
    docValue(doc, "anonymousTransactions"),
    false
  ),
  pendingDeletionAt: docValue(doc, "pendingDeletionAt")
    ? toDate(docValue(doc, "pendingDeletionAt"))
    : null,
  lastDailyRewardClaim: toOptionalDate(docValue(doc, "lastDailyRewardClaim")),
  // optional theme preference
  theme: toOptionalString(docValue(doc, "theme")) as User["theme"],
  // whether the user has a password set
  hasPassword: toBooleanOr(docValue(doc, "hasPassword"), false),
});

export const mapStock = (doc: AppwriteDocument): Stock => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  characterName: toStringOr(docValue(doc, "characterName")),
  characterSlug: toStringOr(docValue(doc, "characterSlug")),
  anilistCharacterId: toNumberOr(docValue(doc, "anilistCharacterId")),
  anilistMediaIds: (docValue(doc, "anilistMediaIds") as string[]) || [],
  anime: toStringOr(docValue(doc, "anime")),
  currentPrice: toNumberOr(docValue(doc, "currentPrice")),
  createdBy: toStringOr(docValue(doc, "createdBy")),
  createdAt: toDate(docValue(doc, "createdAt") ?? doc.$createdAt),
  imageUrl: toStringOr(docValue(doc, "imageUrl")),
  animeImageUrl: toOptionalString(docValue(doc, "animeImageUrl")),
  description: toStringOr(docValue(doc, "description")),
  totalShares: toNumberOr(docValue(doc, "totalShares")),
  availableShares: toNumberOr(docValue(doc, "availableShares")),
});

export const mapTransaction = (doc: AppwriteDocument): Transaction => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  userId: toStringOr(docValue(doc, "userId")),
  stockId: toStringOr(docValue(doc, "stockId")),
  type: (docValue(doc, "type") as Transaction["type"]) ?? "buy",
  shares: toNumberOr(docValue(doc, "shares")),
  pricePerShare: toNumberOr(docValue(doc, "pricePerShare")),
  totalAmount: toNumberOr(docValue(doc, "totalAmount")),
  timestamp: toDate(docValue(doc, "timestamp") ?? doc.$createdAt),
  isAnonymous: toBooleanOr(docValue(doc, "isAnonymous"), false),
});

export const mapPriceHistory = (doc: AppwriteDocument): PriceHistory => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  stockId: toStringOr(docValue(doc, "stockId")),
  price: toNumberOr(docValue(doc, "price")),
  timestamp: toDate(docValue(doc, "timestamp") ?? doc.$createdAt),
});

export const mapPortfolio = (doc: AppwriteDocument): Portfolio => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  userId: toStringOr(docValue(doc, "userId")),
  stockId: toStringOr(docValue(doc, "stockId")),
  shares: toNumberOr(docValue(doc, "shares")),
  averageBuyPrice: toNumberOr(docValue(doc, "averageBuyPrice")),
});

export const mapComment = (doc: AppwriteDocument): Comment => {
  return {
    id: toStringOr(docValue(doc, "id"), doc.$id),
    userId: toStringOr(docValue(doc, "userId")),
    animeId: toOptionalString(docValue(doc, "animeId")),
    characterId: toOptionalString(docValue(doc, "characterId")),
    content: toStringOr(docValue(doc, "content")),
    timestamp: toDate(docValue(doc, "timestamp") ?? doc.$createdAt),
    parentId: toOptionalString(docValue(doc, "parentId")),
    tags: toArrayOr<ContentTag>(docValue(doc, "tags"), []),
    likedBy: toArrayOr<string>(docValue(doc, "likedBy"), []),
    dislikedBy: toArrayOr<string>(docValue(doc, "dislikedBy"), []),
    editedAt: toOptionalDate(docValue(doc, "editedAt")),
  };
};

export const mapBuybackOffer = (doc: AppwriteDocument): BuybackOffer => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  stockId: toStringOr(docValue(doc, "stockId")),
  offeredPrice: toNumberOr(docValue(doc, "offeredPrice")),
  offeredBy: toStringOr(docValue(doc, "offeredBy")),
  targetUsers: toArrayOr<string>(docValue(doc, "targetUsers"), []),
  createdAt: toDate(docValue(doc, "createdAt") ?? doc.$createdAt),
  expiresAt: toDate(docValue(doc, "expiresAt")),
  status: (docValue(doc, "status") as BuybackOffer["status"]) ?? "active",
  targetShares: toOptionalNumber(docValue(doc, "targetShares")),
  acceptedBy: toOptionalString(docValue(doc, "acceptedBy")),
  acceptedByUsers: toArrayOr<string>(docValue(doc, "acceptedByUsers"), []),
  acceptedShares: toOptionalNumber(docValue(doc, "acceptedShares")),
});

export const mapNotification = (doc: AppwriteDocument): Notification => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  userId: toStringOr(docValue(doc, "userId")),
  type: (docValue(doc, "type") as Notification["type"]) ?? "system",
  title: toStringOr(docValue(doc, "title")),
  message: toStringOr(docValue(doc, "message")),
  data: docValue(doc, "data"),
  read: toBooleanOr(docValue(doc, "read")),
  createdAt: toDate(docValue(doc, "createdAt") ?? doc.$createdAt),
});

export const mapReport = (doc: AppwriteDocument): Report => {
  const metadata = parseMetadata(docValue(doc, "metadata"));

  return {
    id: toStringOr(docValue(doc, "id"), doc.$id),
    reporterId: toStringOr(docValue(doc, "reporterId")),
    reportedUserId: toStringOr(docValue(doc, "reportedUserId")),
    contentType:
      (docValue(doc, "contentType") as Report["contentType"]) ?? "comment",
    commentId: toOptionalString(docValue(doc, "commentId")),
    messageId: toOptionalString(docValue(doc, "messageId")),
    commentContent: toOptionalString(metadata?.commentContent),
    messageContent: toOptionalString(metadata?.messageContent),
    reason:
      (docValue(doc, "reason") as
        | "spam"
        | "harassment"
        | "inappropriate"
        | "nsfw"
        | "spoiler"
        | "other") ?? "other",
    description: toOptionalString(docValue(doc, "description")),
    status:
      (docValue(doc, "status") as "pending" | "resolved" | "dismissed") ??
      "pending",
    createdAt: toDate(docValue(doc, "createdAt") ?? doc.$createdAt),
    resolvedAt: toOptionalDate(docValue(doc, "resolvedAt")),
    resolvedBy: toOptionalString(docValue(doc, "resolvedBy")),
    resolution: docValue(doc, "resolution") as "dismiss" | "warn" | "ban",
    threadContext: metadata?.threadContext,
    commentLocation: metadata?.commentLocation,
  };
};

const parseThreadContext = (value: unknown): CommentSnapshot[] | undefined => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const parsed = JSON.parse(value) as Array<{
      id: string;
      userId: string;
      animeId: string;
      characterId?: string;
      content: string;
      parentId?: string;
      timestamp: string;
      tags?: ContentTag[];
    }>;
    return parsed.map((snapshot) => ({
      ...snapshot,
      timestamp: toDate(snapshot.timestamp),
      tags: snapshot.tags ?? [],
    }));
  } catch {
    return undefined;
  }
};

const parseLocation = (
  value: unknown
): { animeId: string; characterId?: string } | undefined => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const parsed = JSON.parse(value) as {
      animeId: string;
      characterId?: string;
    };
    if (!parsed.animeId) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
};

const parseMetadata = (
  value: unknown
):
  | {
      commentContent?: string;
      messageContent?: string;
      threadContext?: CommentSnapshot[];
      commentLocation?: { animeId: string; characterId?: string };
      editedAt?: Date;
      originalContent?: string;
    }
  | undefined => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const parsed = JSON.parse(value) as {
      commentContent?: string;
      messageContent?: string;
      threadContext?: Array<{
        id: string;
        userId: string;
        animeId: string;
        characterId?: string;
        content: string;
        parentId?: string;
        timestamp: string;
        tags?: ContentTag[];
      }>;
      commentLocation?: {
        animeId: string;
        characterId?: string;
      };
      editedAt?: string;
      originalContent?: string;
    };

    return {
      commentContent: parsed.commentContent,
      messageContent: parsed.messageContent,
      threadContext: parsed.threadContext?.map((snapshot) => ({
        ...snapshot,
        timestamp: toDate(snapshot.timestamp),
        tags: snapshot.tags ?? [],
      })),
      commentLocation: parsed.commentLocation,
      editedAt: parsed.editedAt ? toDate(parsed.editedAt) : undefined,
      originalContent: parsed.originalContent,
    };
  } catch {
    return undefined;
  }
};

const parseRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // ignore
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
};

// Message mapping
export const mapMessage = (doc: AppwriteDocument): Message => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  conversationId: toStringOr(docValue(doc, "conversationId")),
  senderId: toStringOr(docValue(doc, "senderId")),
  content: toStringOr(docValue(doc, "content")),
  createdAt: toDate(docValue(doc, "createdAt")),
  readBy: toArrayOr(docValue(doc, "readBy"), []),
  replyToMessageId: toOptionalString(docValue(doc, "replyToMessageId")),
  editedAt: toOptionalDate(docValue(doc, "editedAt")),
});

export const mapAppeal = (doc: AppwriteDocument): Appeal => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  userId: toStringOr(docValue(doc, "userId")),
  message: toStringOr(docValue(doc, "message")),
  createdAt: toDate(docValue(doc, "createdAt") ?? doc.$createdAt),
  status: (docValue(doc, "status") as Appeal["status"]) ?? "pending",
  resolvedAt: toOptionalDate(docValue(doc, "resolvedAt")),
  resolvedBy: toOptionalString(docValue(doc, "resolvedBy")),
  resolutionNotes: toOptionalString(docValue(doc, "resolutionNotes")),
});

export const mapAdminActionLog = (doc: AppwriteDocument): AdminActionLog => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  action:
    (docValue(doc, "action") as AdminActionLog["action"]) ?? "money_grant",
  performedBy: toStringOr(docValue(doc, "performedBy")),
  targetUserId: toStringOr(docValue(doc, "targetUserId")),
  createdAt: toDate(docValue(doc, "createdAt") ?? doc.$createdAt),
  metadata: parseRecord(docValue(doc, "metadata")),
});

export const mapSupportTicket = (doc: AppwriteDocument): SupportTicket => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  userId: toOptionalString(docValue(doc, "userId")),
  contactEmail: toOptionalString(
    docValue(doc, "contactEmail") ?? docValue(doc, "email")
  ),
  subject: toStringOr(docValue(doc, "subject")),
  message: toStringOr(docValue(doc, "message")),
  messages: (() => {
    const raw = docValue(doc, "messages");
    let arr: any[] = [];
    if (Array.isArray(raw)) arr = raw;
    else if (typeof raw === "string" && raw.trim()) {
      try {
        arr = JSON.parse(raw);
      } catch {
        arr = [];
      }
    }
    return toArrayOr(arr, []).map((m: any) => ({
      senderId: toOptionalString(m.senderId),
      text: toStringOr(m.text),
      createdAt: toDate(m.createdAt),
    }));
  })(),
  status: (docValue(doc, "status") as SupportTicket["status"]) ?? "open",
  tag: (docValue(doc, "tag") as import("../types").SupportTicketTag) ?? "other",
  referenceId: toOptionalString(docValue(doc, "referenceId")),
  createdAt: toDate(docValue(doc, "createdAt") ?? doc.$createdAt),
  updatedAt: toDate(docValue(doc, "updatedAt") ?? doc.$updatedAt),
  assignedTo: toOptionalString(docValue(doc, "assignedTo")),
});

export const mapAward = (doc: AppwriteDocument): Award => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  userId: toStringOr(docValue(doc, "userId")),
  type: (docValue(doc, "type") as Award["type"]) ?? "first_trade",
  unlockedAt: toDate(docValue(doc, "unlockedAt") ?? doc.$createdAt),
  redeemed: toBooleanOr(docValue(doc, "redeemed"), false),
});

export const mapFriend = (
  doc: AppwriteDocument
): import("../types").Friend => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  requesterId: toStringOr(docValue(doc, "requesterId")),
  receiverId: toStringOr(docValue(doc, "receiverId")),
  status:
    (docValue(doc, "status") as import("../types").FriendStatus) ?? "pending",
  createdAt: toDate(docValue(doc, "createdAt") ?? doc.$createdAt),
  respondedAt: toOptionalDate(docValue(doc, "respondedAt")),
});

export const mapDailyReward = (doc: AppwriteDocument): DailyReward => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  userId: toStringOr(docValue(doc, "userId")),
  lastClaimDate: toDate(docValue(doc, "lastClaimDate") ?? doc.$createdAt),
  currentStreak: toNumberOr(docValue(doc, "currentStreak"), 0),
  longestStreak: toNumberOr(docValue(doc, "longestStreak"), 0),
  totalClaimed: toNumberOr(docValue(doc, "totalClaimed"), 0),
  totalAmount: toNumberOr(docValue(doc, "totalAmount"), 0),
});
