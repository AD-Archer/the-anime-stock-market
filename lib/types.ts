export type ContentTag = "nsfw" | "spoiler";

export interface CommentSnapshot {
  id: string;
  userId: string;
  animeId: string;
  characterId?: string;
  content: string;
  parentId?: string;
  timestamp: Date;
  tags?: ContentTag[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  isAdmin: boolean;
  createdAt: Date;
  bannedUntil: Date | null;
  showNsfw: boolean;
  showSpoilers: boolean;
  isPortfolioPublic: boolean;
}

export interface Stock {
  id: string;
  characterName: string;
  anime: string;
  currentPrice: number;
  createdBy: string;
  createdAt: Date;
  imageUrl: string;
  description: string;
  totalShares: number;
  availableShares: number;
}

export interface Transaction {
  id: string;
  userId: string;
  stockId: string;
  type: "buy" | "sell";
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  timestamp: Date;
}

export interface PriceHistory {
  id: string;
  stockId: string;
  price: number;
  timestamp: Date;
}

export interface Portfolio {
  userId: string;
  stockId: string;
  shares: number;
  averageBuyPrice: number;
}

export interface Comment {
  id: string;
  userId: string;
  animeId?: string;
  characterId?: string;
  content: string;
  timestamp: Date;
  parentId?: string; // For threaded replies
  tags?: ContentTag[];
  likedBy: string[];
  dislikedBy: string[];
  reactions?: Record<string, "like" | "dislike">;
  userReactions?: Record<string, "like" | "dislike">;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  readBy: string[]; // Array of user IDs who have read this message
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage: {
    content: string;
    senderId: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketDataPoint {
  timestamp: Date;
  totalMarketCap: number;
  averagePrice: number;
}

export interface BuybackOffer {
  id: string;
  stockId: string;
  offeredPrice: number;
  offeredBy: string;
  targetUsers?: string[]; // specific users, or all users if empty
  expiresAt: Date;
  status: "active" | "expired" | "accepted" | "declined";
  acceptedBy?: string;
  acceptedShares?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | "buyback_offer"
    | "admin_message"
    | "system"
    | "moderation"
    | "direct_message";
  title: string;
  message: string;
  data?: any; // additional data like buyback offer details
  read: boolean;
  createdAt: Date;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  commentId: string;
  commentContent: string;
  reason:
    | "spam"
    | "harassment"
    | "inappropriate"
    | "nsfw"
    | "spoiler"
    | "other";
  description?: string;
  status: "pending" | "resolved" | "dismissed";
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: "dismiss" | "warn" | "ban";
  threadContext?: CommentSnapshot[];
  commentLocation?: {
    animeId: string;
    characterId?: string;
  };
}
