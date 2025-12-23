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
} from "../types";

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

if (!DATABASE_ID) {
  throw new Error("Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID");
}

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

type AppwriteDocument = Models.Document;
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
    Object.entries(payload as Record<string, unknown>).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ])
  );

export const mapUser = (doc: AppwriteDocument): User => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  username: toStringOr(docValue(doc, "username")),
  email: toStringOr(docValue(doc, "email")),
  balance: toNumberOr(docValue(doc, "balance"), 0),
  isAdmin: toBooleanOr(docValue(doc, "isAdmin")),
  createdAt: toDate(docValue(doc, "createdAt") ?? doc.$createdAt),
  bannedUntil: docValue(doc, "bannedUntil")
    ? toDate(docValue(doc, "bannedUntil"))
    : null,
  showNsfw: toBooleanOr(docValue(doc, "showNsfw"), true),
  showSpoilers: toBooleanOr(docValue(doc, "showSpoilers"), true),
  isPortfolioPublic: toBooleanOr(docValue(doc, "isPortfolioPublic"), false),
  hideTransactions: toBooleanOr(docValue(doc, "hideTransactions"), false),
  anonymousTransactions: toBooleanOr(docValue(doc, "anonymousTransactions"), false),
});

export const mapStock = (doc: AppwriteDocument): Stock => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  characterName: toStringOr(docValue(doc, "characterName")),
  anime: toStringOr(docValue(doc, "anime")),
  currentPrice: toNumberOr(docValue(doc, "currentPrice")),
  createdBy: toStringOr(docValue(doc, "createdBy")),
  createdAt: toDate(docValue(doc, "createdAt") ?? doc.$createdAt),
  imageUrl: toStringOr(docValue(doc, "imageUrl")),
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
  userId: toStringOr(docValue(doc, "userId")),
  stockId: toStringOr(docValue(doc, "stockId")),
  shares: toNumberOr(docValue(doc, "shares")),
  averageBuyPrice: toNumberOr(docValue(doc, "averageBuyPrice")),
});

export const mapComment = (doc: AppwriteDocument): Comment => ({
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
});

export const mapBuybackOffer = (doc: AppwriteDocument): BuybackOffer => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  stockId: toStringOr(docValue(doc, "stockId")),
  offeredPrice: toNumberOr(docValue(doc, "offeredPrice")),
  offeredBy: toStringOr(docValue(doc, "offeredBy")),
  targetUsers: toArrayOr<string>(docValue(doc, "targetUsers"), []),
  expiresAt: toDate(docValue(doc, "expiresAt")),
  status: (docValue(doc, "status") as BuybackOffer["status"]) ?? "active",
  acceptedBy: toOptionalString(docValue(doc, "acceptedBy")),
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

export const mapReport = (doc: AppwriteDocument): Report => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  reporterId: toStringOr(docValue(doc, "reporterId")),
  reportedUserId: toStringOr(docValue(doc, "reportedUserId")),
  commentId: toStringOr(docValue(doc, "commentId")),
  commentContent: toStringOr(docValue(doc, "commentContent")),
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
  threadContext: parseThreadContext(docValue(doc, "threadContext")),
  commentLocation: parseLocation(docValue(doc, "commentLocation")),
});

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

// Message mapping
export const mapMessage = (doc: AppwriteDocument): Message => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  conversationId: toStringOr(docValue(doc, "conversationId")),
  senderId: toStringOr(docValue(doc, "senderId")),
  content: toStringOr(docValue(doc, "content")),
  createdAt: toDate(docValue(doc, "createdAt")),
  readBy: toArrayOr(docValue(doc, "readBy"), []),
});
