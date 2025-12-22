import { ID, type Models } from "appwrite";
import { databases } from "./appwrite";
import type {
  User,
  Stock,
  Transaction,
  PriceHistory,
  Portfolio,
  Comment,
  BuybackOffer,
  Notification,
} from "./types";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

if (!DATABASE_ID) {
  throw new Error("Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID");
}

// Collections
const USERS_COLLECTION = "users";
const STOCKS_COLLECTION = "stocks";
const TRANSACTIONS_COLLECTION = "transactions";
const PORTFOLIOS_COLLECTION = "portfolios";
const PRICE_HISTORY_COLLECTION = "price_history";
const COMMENTS_COLLECTION = "comments";
const BUYBACK_OFFERS_COLLECTION = "buyback_offers";
const NOTIFICATIONS_COLLECTION = "notifications";

type AppwriteDocument = Models.Document;
type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

const docValue = (doc: AppwriteDocument, key: string): unknown =>
  (doc as any)[key];

const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
};

const toStringOr = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return fallback;
  return String(value);
};

const toOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return toStringOr(value);
};

const toNumberOr = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  return toNumberOr(value);
};

const toBooleanOr = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

const toArrayOr = <T>(value: unknown, fallback: T[] = []): T[] => {
  if (Array.isArray(value)) return value as T[];
  return fallback;
};

const normalizePayload = <T extends object>(
  payload: T
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ])
  );

const mapUser = (doc: AppwriteDocument): User => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  username: toStringOr(docValue(doc, "username")),
  email: toStringOr(docValue(doc, "email")),
  balance: toNumberOr(docValue(doc, "balance"), 0),
  isAdmin: toBooleanOr(docValue(doc, "isAdmin")),
  createdAt: toDate(docValue(doc, "createdAt") ?? doc.$createdAt),
  isBanned: toBooleanOr(docValue(doc, "isBanned")),
});

const mapStock = (doc: AppwriteDocument): Stock => ({
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

const mapTransaction = (doc: AppwriteDocument): Transaction => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  userId: toStringOr(docValue(doc, "userId")),
  stockId: toStringOr(docValue(doc, "stockId")),
  type: (docValue(doc, "type") as Transaction["type"]) ?? "buy",
  shares: toNumberOr(docValue(doc, "shares")),
  pricePerShare: toNumberOr(docValue(doc, "pricePerShare")),
  totalAmount: toNumberOr(docValue(doc, "totalAmount")),
  timestamp: toDate(docValue(doc, "timestamp") ?? doc.$createdAt),
});

const mapPriceHistory = (doc: AppwriteDocument): PriceHistory => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  stockId: toStringOr(docValue(doc, "stockId")),
  price: toNumberOr(docValue(doc, "price")),
  timestamp: toDate(docValue(doc, "timestamp") ?? doc.$createdAt),
});

const mapPortfolio = (doc: AppwriteDocument): Portfolio => ({
  userId: toStringOr(docValue(doc, "userId")),
  stockId: toStringOr(docValue(doc, "stockId")),
  shares: toNumberOr(docValue(doc, "shares")),
  averageBuyPrice: toNumberOr(docValue(doc, "averageBuyPrice")),
});

const mapComment = (doc: AppwriteDocument): Comment => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  userId: toStringOr(docValue(doc, "userId")),
  animeId: toStringOr(docValue(doc, "animeId")),
  characterId: toOptionalString(docValue(doc, "characterId")),
  content: toStringOr(docValue(doc, "content")),
  timestamp: toDate(docValue(doc, "timestamp") ?? doc.$createdAt),
});

const mapBuybackOffer = (doc: AppwriteDocument): BuybackOffer => ({
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

const mapNotification = (doc: AppwriteDocument): Notification => ({
  id: toStringOr(docValue(doc, "id"), doc.$id),
  userId: toStringOr(docValue(doc, "userId")),
  type: (docValue(doc, "type") as Notification["type"]) ?? "system",
  title: toStringOr(docValue(doc, "title")),
  message: toStringOr(docValue(doc, "message")),
  data: docValue(doc, "data"),
  read: toBooleanOr(docValue(doc, "read")),
  createdAt: toDate(docValue(doc, "createdAt") ?? doc.$createdAt),
});

export const userService = {
  async getAll(): Promise<User[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION
      );
      return response.documents.map(mapUser);
    } catch (error) {
      console.warn("Failed to fetch users from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<User | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION,
        id
      );
      return mapUser(response);
    } catch (error) {
      console.warn("Failed to fetch user from database:", error);
      return null;
    }
  },

  async create(user: Creatable<User>): Promise<User> {
    try {
      const documentId = user.id ?? ID.unique();
      const { id: _ignored, ...data } = user as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapUser(response);
    } catch (error) {
      console.warn("Failed to create user in database:", error);
      throw error;
    }
  },

  async update(id: string, user: Partial<User>): Promise<User> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION,
        id,
        normalizePayload(user)
      );
      return mapUser(response);
    } catch (error) {
      console.warn("Failed to update user in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, USERS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete user from database:", error);
      throw error;
    }
  },
};

export const stockService = {
  async getAll(): Promise<Stock[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        STOCKS_COLLECTION
      );
      return response.documents.map(mapStock);
    } catch (error) {
      console.warn("Failed to fetch stocks from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Stock | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        STOCKS_COLLECTION,
        id
      );
      return mapStock(response);
    } catch (error) {
      console.warn("Failed to fetch stock from database:", error);
      return null;
    }
  },

  async create(stock: Creatable<Stock>): Promise<Stock> {
    try {
      const documentId = stock.id ?? ID.unique();
      const { id: _ignored, ...data } = stock as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        STOCKS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapStock(response);
    } catch (error) {
      console.warn("Failed to create stock in database:", error);
      throw error;
    }
  },

  async update(id: string, stock: Partial<Stock>): Promise<Stock> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        STOCKS_COLLECTION,
        id,
        normalizePayload(stock)
      );
      return mapStock(response);
    } catch (error) {
      console.warn("Failed to update stock in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, STOCKS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete stock from database:", error);
      throw error;
    }
  },
};

export const transactionService = {
  async getAll(): Promise<Transaction[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        TRANSACTIONS_COLLECTION
      );
      return response.documents.map(mapTransaction);
    } catch (error) {
      console.warn("Failed to fetch transactions from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Transaction | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        TRANSACTIONS_COLLECTION,
        id
      );
      return mapTransaction(response);
    } catch (error) {
      console.warn("Failed to fetch transaction from database:", error);
      return null;
    }
  },

  async create(transaction: Creatable<Transaction>): Promise<Transaction> {
    try {
      const documentId = transaction.id ?? ID.unique();
      const { id: _ignored, ...data } = transaction as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        TRANSACTIONS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapTransaction(response);
    } catch (error) {
      console.warn("Failed to create transaction in database:", error);
      throw error;
    }
  },

  async update(
    id: string,
    transaction: Partial<Transaction>
  ): Promise<Transaction> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        TRANSACTIONS_COLLECTION,
        id,
        normalizePayload(transaction)
      );
      return mapTransaction(response);
    } catch (error) {
      console.warn("Failed to update transaction in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, TRANSACTIONS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete transaction from database:", error);
      throw error;
    }
  },
};

export const portfolioService = {
  async getAll(): Promise<Portfolio[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        PORTFOLIOS_COLLECTION
      );
      return response.documents.map(mapPortfolio);
    } catch (error) {
      console.warn("Failed to fetch portfolios from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Portfolio | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        PORTFOLIOS_COLLECTION,
        id
      );
      return mapPortfolio(response);
    } catch (error) {
      console.warn("Failed to fetch portfolio from database:", error);
      return null;
    }
  },

  async create(portfolio: Portfolio): Promise<Portfolio> {
    try {
      const documentId = `${portfolio.userId}-${portfolio.stockId}`;
      const response = await databases.createDocument(
        DATABASE_ID,
        PORTFOLIOS_COLLECTION,
        documentId,
        normalizePayload(portfolio)
      );
      return mapPortfolio(response);
    } catch (error) {
      console.warn("Failed to create portfolio in database:", error);
      throw error;
    }
  },

  async update(id: string, portfolio: Partial<Portfolio>): Promise<Portfolio> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        PORTFOLIOS_COLLECTION,
        id,
        normalizePayload(portfolio)
      );
      return mapPortfolio(response);
    } catch (error) {
      console.warn("Failed to update portfolio in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, PORTFOLIOS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete portfolio from database:", error);
      throw error;
    }
  },
};

export const priceHistoryService = {
  async getAll(): Promise<PriceHistory[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        PRICE_HISTORY_COLLECTION
      );
      return response.documents.map(mapPriceHistory);
    } catch (error) {
      console.warn("Failed to fetch price history from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<PriceHistory | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        PRICE_HISTORY_COLLECTION,
        id
      );
      return mapPriceHistory(response);
    } catch (error) {
      console.warn("Failed to fetch price history from database:", error);
      return null;
    }
  },

  async create(priceHistory: Creatable<PriceHistory>): Promise<PriceHistory> {
    try {
      const documentId = priceHistory.id ?? ID.unique();
      const { id: _ignored, ...data } = priceHistory as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        PRICE_HISTORY_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapPriceHistory(response);
    } catch (error) {
      console.warn("Failed to create price history in database:", error);
      throw error;
    }
  },

  async update(
    id: string,
    priceHistory: Partial<PriceHistory>
  ): Promise<PriceHistory> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        PRICE_HISTORY_COLLECTION,
        id,
        normalizePayload(priceHistory)
      );
      return mapPriceHistory(response);
    } catch (error) {
      console.warn("Failed to update price history in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, PRICE_HISTORY_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete price history from database:", error);
      throw error;
    }
  },
};

export const commentService = {
  async getAll(): Promise<Comment[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COMMENTS_COLLECTION
      );
      return response.documents.map(mapComment);
    } catch (error) {
      console.warn("Failed to fetch comments from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Comment | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION,
        id
      );
      return mapComment(response);
    } catch (error) {
      console.warn("Failed to fetch comment from database:", error);
      return null;
    }
  },

  async create(comment: Creatable<Comment>): Promise<Comment> {
    try {
      const documentId = comment.id ?? ID.unique();
      const { id: _ignored, ...data } = comment as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapComment(response);
    } catch (error) {
      console.warn("Failed to create comment in database:", error);
      throw error;
    }
  },

  async update(id: string, comment: Partial<Comment>): Promise<Comment> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION,
        id,
        normalizePayload(comment)
      );
      return mapComment(response);
    } catch (error) {
      console.warn("Failed to update comment in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, COMMENTS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete comment from database:", error);
      throw error;
    }
  },
};

export const buybackOfferService = {
  async getAll(): Promise<BuybackOffer[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        BUYBACK_OFFERS_COLLECTION
      );
      return response.documents.map(mapBuybackOffer);
    } catch (error) {
      console.warn("Failed to fetch buyback offers from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<BuybackOffer | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        BUYBACK_OFFERS_COLLECTION,
        id
      );
      return mapBuybackOffer(response);
    } catch (error) {
      console.warn("Failed to fetch buyback offer from database:", error);
      return null;
    }
  },

  async create(buybackOffer: Creatable<BuybackOffer>): Promise<BuybackOffer> {
    try {
      const documentId = buybackOffer.id ?? ID.unique();
      const { id: _ignored, ...data } = buybackOffer as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        BUYBACK_OFFERS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapBuybackOffer(response);
    } catch (error) {
      console.warn("Failed to create buyback offer in database:", error);
      throw error;
    }
  },

  async update(
    id: string,
    buybackOffer: Partial<BuybackOffer>
  ): Promise<BuybackOffer> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        BUYBACK_OFFERS_COLLECTION,
        id,
        normalizePayload(buybackOffer)
      );
      return mapBuybackOffer(response);
    } catch (error) {
      console.warn("Failed to update buyback offer in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        BUYBACK_OFFERS_COLLECTION,
        id
      );
    } catch (error) {
      console.warn("Failed to delete buyback offer from database:", error);
      throw error;
    }
  },
};

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION
      );
      return response.documents.map(mapNotification);
    } catch (error) {
      console.warn("Failed to fetch notifications from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Notification | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION,
        id
      );
      return mapNotification(response);
    } catch (error) {
      console.warn("Failed to fetch notification from database:", error);
      return null;
    }
  },

  async create(notification: Creatable<Notification>): Promise<Notification> {
    try {
      const documentId = notification.id ?? ID.unique();
      const { id: _ignored, ...data } = notification as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapNotification(response);
    } catch (error) {
      console.warn("Failed to create notification in database:", error);
      throw error;
    }
  },

  async update(
    id: string,
    notification: Partial<Notification>
  ): Promise<Notification> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION,
        id,
        normalizePayload(notification)
      );
      return mapNotification(response);
    } catch (error) {
      console.warn("Failed to update notification in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete notification from database:", error);
      throw error;
    }
  },
};
