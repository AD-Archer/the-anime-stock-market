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
  hideTransactions: boolean;
  anonymousTransactions: boolean;
  pendingDeletionAt: Date | null;
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
  isAnonymous?: boolean;
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
  editedAt?: Date;
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
    | "liquidity_request"
    | "admin_message"
    | "system"
    | "moderation"
    | "direct_message"
    | "friend_request";
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

export type AppealStatus = "pending" | "approved" | "rejected";

export interface Appeal {
  id: string;
  userId: string;
  message: string;
  createdAt: Date;
  status: AppealStatus;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export type AdminActionType =
  | "money_grant"
  | "money_withdrawal"
  | "stock_grant"
  | "stock_removal"
  | "ban"
  | "unban"
  | "deletion_scheduled"
  | "deletion_finalized";

export interface AdminActionLog {
  id: string;
  action: AdminActionType;
  performedBy: string;
  targetUserId: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface Award {
  id: string;
  userId: string;
  type: AwardType;
  unlockedAt: Date;
  redeemed?: boolean;
}

export type AwardType =
  | "first_trade"
  | "profit_milestone_100"
  | "profit_milestone_1000"
  | "portfolio_value_1000"
  | "portfolio_value_10000"
  | "diversified_portfolio"
  | "top_trader"
  | "early_adopter"
  | "comment_master"
  | "social_butterfly"
  | "welcome_bonus";

export type FriendStatus = "pending" | "accepted" | "declined";

export interface Friend {
  id: string;
  requesterId: string;
  receiverId: string;
  status: FriendStatus;
  createdAt: Date;
  respondedAt?: Date;
}

export interface AwardDefinition {
  type: AwardType;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  redeemableValue?: number;
}
