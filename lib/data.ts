import type {
  User,
  Stock,
  Transaction,
  PriceHistory,
  Portfolio,
  Comment,
  Report,
  Appeal,
  AdminActionLog,
  Award,
  Friend,
  DailyReward,
  CharacterSuggestion,
  DirectionalBet,
} from "./types";

// Initial users with $100 starting balance
export const initialUsers: User[] = [
  {
    id: "user-1",
    username: "animetrader",
    displayName: "AnimeTrader",
    displaySlug: "animetrader",
    email: "trader@anime.com",
    balance: 100,
    isAdmin: false,
    isBanned: false,
    createdAt: new Date("2025-12-01"),
    bannedUntil: null,
    showNsfw: true,
    showSpoilers: true,
    isPortfolioPublic: true,
    hideTransactions: false,
    anonymousTransactions: false,
    pendingDeletionAt: null,
  },
  {
    id: "user-2",
    username: "stockmaster",
    displayName: "StockMaster",
    displaySlug: "stockmaster",
    email: "master@anime.com",
    balance: 100,
    isAdmin: false,
    isBanned: false,
    createdAt: new Date("2025-12-02"),
    bannedUntil: null,
    showNsfw: true,
    showSpoilers: true,
    isPortfolioPublic: false,
    hideTransactions: false,
    anonymousTransactions: false,
    pendingDeletionAt: null,
  },
  {
    id: "admin-1",
    username: "admin",
    displayName: "Admin",
    displaySlug: "admin",
    email: "admin@anime.com",
    balance: 10000,
    isAdmin: true,
    isBanned: false,
    createdAt: new Date("2025-12-01"),
    bannedUntil: null,
    showNsfw: true,
    showSpoilers: true,
    isPortfolioPublic: true,
    hideTransactions: false,
    anonymousTransactions: false,
    pendingDeletionAt: null,
  },
];

// Initial stocks
export const initialStocks: Stock[] = [
  {
    id: "stock-1",
    characterName: "Monkey D. Luffy",
    characterSlug: "monkey-d-luffy",
    anilistCharacterId: 0,
    anilistMediaIds: [],
    anime: "One Piece",
    currentPrice: 1.0,
    createdBy: "user-1",
    createdAt: new Date("2025-12-15T10:00:00"),
    imageUrl: "/characters/luffy-one-piece-anime-character.jpg",
    description: "The future Pirate King! Captain of the Straw Hat Pirates.",
    totalShares: 10000,
    availableShares: 9500,
  },
  {
    id: "stock-2",
    characterName: "Naruto Uzumaki",
    characterSlug: "naruto-uzumaki",
    anilistCharacterId: 0,
    anilistMediaIds: [],
    anime: "Naruto",
    currentPrice: 2.5,
    createdBy: "user-2",
    createdAt: new Date("2025-12-16T14:30:00"),
    imageUrl: "/characters/naruto-uzumaki-anime-character.jpg",
    description: "Believe it! The Seventh Hokage of the Hidden Leaf Village.",
    totalShares: 8000,
    availableShares: 7200,
  },
  {
    id: "stock-3",
    characterName: "Goku",
    characterSlug: "goku",
    anilistCharacterId: 0,
    anilistMediaIds: [],
    anime: "Dragon Ball Z",
    currentPrice: 5.0,
    createdBy: "user-1",
    createdAt: new Date("2025-12-17T09:15:00"),
    imageUrl: "/characters/goku-dragon-ball-z-anime-character.jpg",
    description: "The legendary Super Saiyan warrior protecting Earth.",
    totalShares: 5000,
    availableShares: 4000,
  },
  {
    id: "stock-4",
    characterName: "Levi Ackerman",
    characterSlug: "levi-ackerman",
    anilistCharacterId: 0,
    anilistMediaIds: [],
    anime: "Attack on Titan",
    currentPrice: 3.75,
    createdBy: "user-2",
    createdAt: new Date("2025-12-18T16:45:00"),
    imageUrl: "/characters/levi-ackerman-attack-on-titan-anime-character.jpg",
    description:
      "Humanity's strongest soldier and captain of the Survey Corps.",
    totalShares: 6000,
    availableShares: 5400,
  },
  {
    id: "stock-5",
    characterName: "Edward Elric",
    characterSlug: "edward-elric",
    anilistCharacterId: 0,
    anilistMediaIds: [],
    anime: "Fullmetal Alchemist",
    currentPrice: 2.25,
    createdBy: "user-1",
    createdAt: new Date("2025-12-19T11:20:00"),
    imageUrl:
      "/characters/edward-elric-fullmetal-alchemist-anime-character.jpg",
    description:
      "The Fullmetal Alchemist searching for the Philosopher's Stone.",
    totalShares: 7000,
    availableShares: 6300,
  },
];

// Initial transactions
export const initialTransactions: Transaction[] = [
  {
    id: "tx-1",
    userId: "user-1",
    stockId: "stock-1",
    type: "buy",
    shares: 100,
    pricePerShare: 1.0,
    totalAmount: 100,
    timestamp: new Date("2025-12-15T10:30:00"),
  },
  {
    id: "tx-2",
    userId: "user-2",
    stockId: "stock-2",
    type: "buy",
    shares: 50,
    pricePerShare: 2.5,
    totalAmount: 125,
    timestamp: new Date("2025-12-16T15:00:00"),
  },
  {
    id: "tx-3",
    userId: "user-1",
    stockId: "stock-3",
    type: "buy",
    shares: 200,
    pricePerShare: 5.0,
    totalAmount: 1000,
    timestamp: new Date("2025-12-17T10:00:00"),
  },
  {
    id: "tx-4",
    userId: "user-2",
    stockId: "stock-4",
    type: "buy",
    shares: 150,
    pricePerShare: 3.75,
    totalAmount: 562.5,
    timestamp: new Date("2025-12-18T17:00:00"),
  },
];

export const initialDirectionalBets: DirectionalBet[] = [];

// Price history for tracking stock prices over time
export const initialPriceHistory: PriceHistory[] = [
  // Luffy price history
  {
    id: "ph-1",
    stockId: "stock-1",
    price: 1.0,
    timestamp: new Date("2025-12-15T10:00:00"),
  },
  {
    id: "ph-2",
    stockId: "stock-1",
    price: 1.05,
    timestamp: new Date("2025-12-16T10:00:00"),
  },
  {
    id: "ph-3",
    stockId: "stock-1",
    price: 1.02,
    timestamp: new Date("2025-12-17T10:00:00"),
  },
  {
    id: "ph-4",
    stockId: "stock-1",
    price: 1.08,
    timestamp: new Date("2025-12-18T10:00:00"),
  },
  {
    id: "ph-5",
    stockId: "stock-1",
    price: 1.0,
    timestamp: new Date("2025-12-19T10:00:00"),
  },

  // Naruto price history
  {
    id: "ph-6",
    stockId: "stock-2",
    price: 2.5,
    timestamp: new Date("2025-12-16T14:30:00"),
  },
  {
    id: "ph-7",
    stockId: "stock-2",
    price: 2.6,
    timestamp: new Date("2025-12-17T14:30:00"),
  },
  {
    id: "ph-8",
    stockId: "stock-2",
    price: 2.55,
    timestamp: new Date("2025-12-18T14:30:00"),
  },
  {
    id: "ph-9",
    stockId: "stock-2",
    price: 2.5,
    timestamp: new Date("2025-12-19T14:30:00"),
  },

  // Goku price history
  {
    id: "ph-10",
    stockId: "stock-3",
    price: 5.0,
    timestamp: new Date("2025-12-17T09:15:00"),
  },
  {
    id: "ph-11",
    stockId: "stock-3",
    price: 5.2,
    timestamp: new Date("2025-12-18T09:15:00"),
  },
  {
    id: "ph-12",
    stockId: "stock-3",
    price: 5.0,
    timestamp: new Date("2025-12-19T09:15:00"),
  },

  // Levi price history
  {
    id: "ph-13",
    stockId: "stock-4",
    price: 3.75,
    timestamp: new Date("2025-12-18T16:45:00"),
  },
  {
    id: "ph-14",
    stockId: "stock-4",
    price: 3.8,
    timestamp: new Date("2025-12-19T16:45:00"),
  },

  // Edward price history
  {
    id: "ph-15",
    stockId: "stock-5",
    price: 2.25,
    timestamp: new Date("2025-12-19T11:20:00"),
  },
];

// Initial portfolios
export const initialPortfolios: Portfolio[] = [
  {
    id: "port-001",
    userId: "user-1",
    stockId: "stock-1",
    shares: 100,
    averageBuyPrice: 1.0,
  },
  {
    id: "port-002",
    userId: "user-1",
    stockId: "stock-3",
    shares: 200,
    averageBuyPrice: 5.0,
  },
  {
    id: "port-003",
    userId: "user-2",
    stockId: "stock-2",
    shares: 50,
    averageBuyPrice: 2.5,
  },
  {
    id: "port-004",
    userId: "user-2",
    stockId: "stock-4",
    shares: 150,
    averageBuyPrice: 3.75,
  },
];

export const initialComments: Comment[] = [
  {
    id: "comment-1",
    userId: "user-1",
    animeId: "one-piece",
    characterId: "stock-1",
    content: "Luffy is going to the moon! Best investment ever!",
    timestamp: new Date("2025-12-15T11:00:00"),
    tags: [],
    likedBy: [],
    dislikedBy: [],
  },
  {
    id: "comment-2",
    userId: "user-2",
    animeId: "naruto",
    content: "Naruto stocks are undervalued right now. Great time to buy!",
    timestamp: new Date("2025-12-16T15:30:00"),
    tags: ["spoiler"],
    likedBy: [],
    dislikedBy: [],
  },
];

import type { BuybackOffer, Notification } from "./types";

// Initial buyback offers (empty)
export const initialBuybackOffers: BuybackOffer[] = [];

// Initial notifications (empty)
export const initialNotifications: Notification[] = [];

// Initial reports (empty)
export const initialReports: Report[] = [];

export const initialAppeals: Appeal[] = [];
export const initialAdminActionLogs: AdminActionLog[] = [];
export const initialAwards: Award[] = [];
export const initialFriends: Friend[] = [];
export const initialDailyRewards: DailyReward[] = [];
export const initialCharacterSuggestions: CharacterSuggestion[] = [];
