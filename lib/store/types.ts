import type {
  BuybackOffer,
  Comment,
  Conversation,
  MarketDataPoint,
  Message,
  Notification,
  Portfolio,
  PriceHistory,
  Report,
  Stock,
  Transaction,
  User,
  Appeal,
  AdminActionLog,
  Award,
  AppealStatus,
  AdminActionType,
  Friend,
} from "../types";

export type AddCommentInput = {
  animeId?: string;
  content: string;
  characterId?: string;
  parentId?: string;
  tags?: Comment["tags"];
};

export interface StoreContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
  authUser: { id: string } | null;

  users: User[];
  stocks: Stock[];
  transactions: Transaction[];
  priceHistory: PriceHistory[];
  portfolios: Portfolio[];
  comments: Comment[];
  buybackOffers: BuybackOffer[];
  notifications: Notification[];
  reports: Report[];
  appeals: Appeal[];
  adminActionLogs: AdminActionLog[];
  awards: Award[];
  friends: Friend[];
  messages: Message[];
  conversations: Conversation[];

  buyStock: (stockId: string, shares: number) => Promise<boolean>;
  sellStock: (stockId: string, shares: number) => Promise<boolean>;
  createStock: (stock: Omit<Stock, "id" | "createdAt">) => void;
  updateStockPrice: (stockId: string, newPrice: number) => void;
  deleteStock: (stockId: string) => void;
  createShares: (stockId: string, newShareCount: number) => void;
  banUser: (
    userId: string,
    duration: "week" | "month" | "year" | "forever" | Date
  ) => void;
  unbanUser: (userId: string) => void;
  deleteUser: (userId: string) => Promise<void>;
  processPendingDeletions: () => Promise<void>;
  getUserPortfolio: (userId: string) => Portfolio[];
  getStockPriceHistory: (stockId: string) => PriceHistory[];
  getMarketData: () => MarketDataPoint[];
  addComment: (input: AddCommentInput) => Promise<void>;
  editComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  getAnimeComments: (animeId: string) => Comment[];
  getCharacterComments: (characterId: string) => Comment[];
  getMarketComments: () => Comment[];
  toggleCommentReaction: (
    commentId: string,
    reaction: "like" | "dislike"
  ) => Promise<void>;
  reopenReport: (reportId: string) => Promise<void>;
  reopenAppeal: (appealId: string) => Promise<void>;
  updateContentPreferences: (preferences: {
    showNsfw?: boolean;
    showSpoilers?: boolean;
    isPortfolioPublic?: boolean;
    hideTransactions?: boolean;
    anonymousTransactions?: boolean;
  }) => Promise<void>;

  makeUserAdmin: (userId: string) => void;
  removeUserAdmin: (userId: string) => void;
  giveUserMoney: (userId: string, amount: number) => Promise<void>;
  takeUserMoney: (userId: string, amount: number) => Promise<void>;
  giveUserStocks: (
    userId: string,
    stockId: string,
    shares: number
  ) => Promise<void>;
  removeUserStocks: (
    userId: string,
    stockId: string,
    shares: number
  ) => Promise<void>;
  inflateMarket: (percentage: number) => void;
  createBuybackOffer: (
    stockId: string,
    offeredPrice: number,
    targetUsers?: string[],
    expiresInHours?: number,
    targetShares?: number
  ) => void;
  acceptBuybackOffer: (offerId: string, shares: number) => void;
  declineBuybackOffer: (offerId: string) => void;
  cancelBuybackOffer: (offerId: string) => void;
  removeBuybackOffer: (offerId: string) => Promise<void>;
  sendNotification: (
    userId: string,
    type: Notification["type"],
    title: string,
    message: string,
    data?: any
  ) => void;
  getUserNotifications: (userId: string) => Notification[];
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: (userId: string) => Promise<void>;
  clearNotifications: (userId: string) => Promise<void>;

  // Friends
  sendFriendRequest: (targetUserId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  getUserFriends: (userId: string) => User[];
  getPendingFriendRequests: (userId: string) => Friend[];

  reportComment: (
    commentId: string,
    reason: Report["reason"],
    description?: string
  ) => Promise<void>;
  reportMessage: (
    messageId: string,
    reason: Report["reason"],
    description?: string
  ) => Promise<void>;
  getReports: () => Promise<Report[]>;
  resolveReport: (
    reportId: string,
    resolution: "dismiss" | "warn" | "ban"
  ) => Promise<void>;

  sendMessage: (
    conversationId: string,
    content: string,
    replyToMessageId?: string
  ) => Promise<Message | null>;
  editMessage: (messageId: string, content: string) => Promise<Message | null>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  getConversationMessages: (conversationId: string) => Promise<Message[]>;
  getUserConversations: (userId: string) => Promise<Conversation[]>;
  createConversation: (participantIds: string[]) => string;
  markMessagesAsRead: (conversationId: string, userId: string) => Promise<void>;
  submitAppeal: (message: string) => Promise<Appeal | null>;
  reviewAppeal: (
    appealId: string,
    status: AppealStatus,
    notes?: string
  ) => Promise<void>;
  logAdminAction: (
    action: AdminActionType,
    targetUserId: string,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
  unlockAward: (userId: string, type: Award["type"]) => Promise<void>;
  getUserAwards: (userId: string) => Award[];
  redeemAward: (awardId: string) => Promise<boolean>;
}

export type StoreState = StoreContextType;
