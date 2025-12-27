export type ContentTag = "nsfw" | "spoiler";
export type MediaType = "anime" | "manga";
export type PremiumComboMode =
  | "standard"
  | "anime-1-manga-1"
  | "anime-2-manga-2";

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
  displayName: string;
  displaySlug: string;
  email: string;
  balance: number;
  isAdmin: boolean;
  isBanned?: boolean;
  hasPassword?: boolean;
  createdAt: Date;
  avatarUrl?: string | null;
  bannedUntil: Date | null;
  showNsfw: boolean;
  showSpoilers: boolean;
  isPortfolioPublic: boolean;
  hideTransactions: boolean;
  anonymousTransactions: boolean;
  pendingDeletionAt: Date | null;
  lastDailyRewardClaim?: Date;
  // optional user theme preference
  theme?: "light" | "dark" | "system";
  emailNotificationsEnabled?: boolean;
  directMessageEmailNotifications?: boolean;
  premiumMeta?: PremiumMeta;
}

export interface Stock {
  id: string;
  characterName: string;
  characterSlug: string;
  anilistCharacterId: number;
  anilistMediaIds: string[];
  anime: string;
  anilistRank?: number;
  currentPrice: number;
  createdBy: string;
  createdAt: Date;
  imageUrl: string;
  animeImageUrl?: string;
  description: string;
  totalShares: number;
  availableShares: number;
  /**
   * Sequential character number (backfilled) to order listings
   */
  characterNumber?: number;
  /**
   * Optional Anilist ID for verification in production seeds.
   * When present, seeds are considered "verified".
   */
  anilistId?: string;
  /**
   * Source of the stock data. Prefer "anilist" for verified items.
   */
  source?: "anilist" | "manual" | string;
  mediaType?: MediaType;
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
  id: string;
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
  premiumOnly?: boolean; // For premium-only comments
  location?: string; // Location identifier (e.g., "premium_page", "anime_123", etc.)
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  readBy: string[]; // Array of user IDs who have read this message
  replyToMessageId?: string;
  editedAt?: Date;
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
  createdAt?: Date;
  expiresAt: Date;
  status: "active" | "expired" | "accepted" | "declined";
  targetShares?: number;
  acceptedBy?: string; // legacy single-user acceptance
  acceptedByUsers?: string[]; // cumulative acceptors
  acceptedShares?: number; // cumulative shares accepted so far
}

export interface DirectionalBet {
  id: string;
  userId: string;
  stockId: string;
  type: "call" | "put";
  amount: number;
  entryPrice: number;
  createdAt: Date;
  expiresAt: Date;
  status: "open" | "settled" | "cancelled";
  result?: "win" | "lose";
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
    | "friend_request"
    | "stock_ipo"
    | "character_suggestion";
  title: string;
  message: string;
  data?: any; // additional data like buyback offer details
  read: boolean;
  createdAt: Date;
  clearedAt?: Date | null;
}

export interface SupportTicketMessage {
  senderId?: string;
  text: string;
  createdAt: Date;
}

export type SupportTicketTag =
  | "feature"
  | "bug"
  | "question"
  | "report"
  | "donation"
  | "premium"
  | "other";

export interface SupportTicket {
  id: string;
  userId?: string;
  // contact email for replies
  contactEmail?: string;
  subject: string;
  message: string;
  messages?: SupportTicketMessage[];
  status: "open" | "in_progress" | "closed";
  tag?: SupportTicketTag;
  // optional reference (e.g., a message ID when reporting a message)
  referenceId?: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string | null;
}

export interface PremiumDonationEntry {
  amount: number;
  date: Date;
}

export type CharacterSuggestionStatus = "pending" | "approved" | "denied";

export interface CharacterSuggestion {
  id: string;
  userId?: string;
  characterName: string;
  anime: string;
  description?: string;
  priority?: boolean;
  anilistUrl?: string;
  anilistCharacterId?: number;
  status: CharacterSuggestionStatus;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  resolutionNotes?: string;
  stockId?: string;
  autoImportStatus?: "not_requested" | "succeeded" | "failed";
  autoImportMessage?: string;
}

export interface PremiumMeta {
  isPremium?: boolean;
  premiumSince?: Date | null;
  charactersAddedToday?: number;
  charactersAddedTodayAnime?: number;
  charactersAddedTodayManga?: number;
  charactersDuplicateToday?: number;
  quotaResetAt?: Date | null;
  autoAdd?: boolean;
  comboMode?: PremiumComboMode;
  tierLevel?: number;
  donationAmount?: number;
  donationDate?: Date | null;
  donationHistory?: PremiumDonationEntry[];
  lastPremiumRewardClaim?: Date | null;
}

export type PremiumAdditionStatus = "added" | "duplicate";
export type PremiumAdditionSource = "manual" | "anilist";

export interface PremiumAddition {
  id: string;
  userId: string;
  stockId: string;
  characterName: string;
  characterSlug: string;
  anime: string;
  imageUrl: string;
  mediaType: MediaType;
  status: PremiumAdditionStatus;
  source: PremiumAdditionSource;
  createdAt: Date;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  contentType?: "comment" | "message";
  commentId?: string;
  messageId?: string;
  commentContent?: string;
  messageContent?: string;
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
  | "deletion_finalized"
  | "support_update"
  | "premium_tier_update"
  | "kill_switch"
  | "stock_creation";

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
  | "welcome_bonus"
  | "admin_ally"
  | "friend_network_5"
  | "friend_network_10"
  | "friend_network_25"
  | "buyback_starter"
  | "buyback_broker"
  | "stock_dilution_survivor"
  | "early_bird_investor";

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
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  redeemableValue?: number;
}

export interface DailyReward {
  id: string;
  userId: string;
  lastClaimDate: Date;
  currentStreak: number;
  longestStreak: number;
  totalClaimed: number;
  totalAmount: number;
}
