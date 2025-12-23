"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import type {
  User,
  Stock,
  Transaction,
  PriceHistory,
  Portfolio,
  Comment,
  MarketDataPoint,
  BuybackOffer,
  Notification,
  Report,
  ContentTag,
  CommentSnapshot,
  Message,
  Conversation,
} from "./types";
import {
  initialUsers,
  initialStocks,
  initialTransactions,
  initialPriceHistory,
  initialPortfolios,
  initialComments,
  initialBuybackOffers,
  initialNotifications,
  initialReports,
} from "./data";
import { databases } from "./appwrite";
import {
  userService,
  stockService,
  transactionService,
  portfolioService,
  priceHistoryService,
  commentService,
  buybackOfferService,
  notificationService,
  reportService,
  messageService,
  DATABASE_ID,
  COMMENTS_COLLECTION,
  STOCKS_COLLECTION,
  PRICE_HISTORY_COLLECTION,
  mapComment,
  mapStock,
  mapPriceHistory,
} from "./database";

type AddCommentInput = {
  animeId?: string;
  content: string;
  characterId?: string;
  parentId?: string;
  tags?: ContentTag[];
};

interface StoreContextType {
  // Current user
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;

  // Data
  users: User[];
  stocks: Stock[];
  transactions: Transaction[];
  priceHistory: PriceHistory[];
  portfolios: Portfolio[];
  comments: Comment[];
  buybackOffers: BuybackOffer[];
  notifications: Notification[];
  reports: Report[];
  messages: Message[];
  conversations: Conversation[];

  // Actions
  buyStock: (stockId: string, shares: number) => boolean;
  sellStock: (stockId: string, shares: number) => boolean;
  createStock: (stock: Omit<Stock, "id" | "createdAt">) => void;
  updateStockPrice: (stockId: string, newPrice: number) => void;
  deleteStock: (stockId: string) => void;
  banUser: (
    userId: string,
    duration: "week" | "month" | "year" | "forever" | Date
  ) => void;
  unbanUser: (userId: string) => void;
  deleteUser: (userId: string) => void;
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
  updateContentPreferences: (preferences: {
    showNsfw?: boolean;
    showSpoilers?: boolean;
    isPortfolioPublic?: boolean;
  }) => Promise<void>;

  // Admin Actions
  makeUserAdmin: (userId: string) => void;
  removeUserAdmin: (userId: string) => void;
  giveUserMoney: (userId: string, amount: number) => void;
  takeUserMoney: (userId: string, amount: number) => void;
  giveUserStocks: (userId: string, stockId: string, shares: number) => void;
  removeUserStocks: (userId: string, stockId: string, shares: number) => void;
  inflateMarket: (percentage: number) => void;
  createBuybackOffer: (
    stockId: string,
    offeredPrice: number,
    targetUsers?: string[],
    expiresInHours?: number
  ) => void;
  acceptBuybackOffer: (offerId: string, shares: number) => void;
  declineBuybackOffer: (offerId: string) => void;
  sendNotification: (
    userId: string,
    type: Notification["type"],
    title: string,
    message: string,
    data?: any
  ) => void;
  getUserNotifications: (userId: string) => Notification[];
  markNotificationRead: (notificationId: string) => void;

  // Reports
  reportComment: (
    commentId: string,
    reason: Report["reason"],
    description?: string
  ) => Promise<void>;
  getReports: () => Promise<Report[]>;
  resolveReport: (
    reportId: string,
    resolution: "dismiss" | "warn" | "ban"
  ) => Promise<void>;

  // Messages
  sendMessage: (
    conversationId: string,
    content: string
  ) => Promise<Message | null>;
  getConversationMessages: (conversationId: string) => Promise<Message[]>;
  getUserConversations: (userId: string) => Promise<Conversation[]>;
  createConversation: (participantIds: string[]) => string;
  markMessagesAsRead: (conversationId: string, userId: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [buybackOffers, setBuybackOffers] = useState<BuybackOffer[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const reportsRef = useRef<Report[]>([]);

  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  // Load data from database on mount
  useEffect(() => {
    if (authLoading) return;

    const loadData = async () => {
      try {
        console.log("Loading data from Appwrite...");
        const [
          usersData,
          stocksData,
          transactionsData,
          buybackOffersData,
          commentsData,
          reportsData,
        ] = await Promise.all([
          userService.getAll(),
          stockService.getAll(),
          transactionService.getAll(),
          buybackOfferService.getAll(),
          commentService.getAll(),
          reportService.getAll(),
        ]);

        setUsers(usersData.length > 0 ? usersData : initialUsers);
        setStocks(stocksData.length > 0 ? stocksData : initialStocks);
        setTransactions(
          transactionsData.length > 0 ? transactionsData : initialTransactions
        );
        setBuybackOffers(
          buybackOffersData.length > 0
            ? buybackOffersData
            : initialBuybackOffers
        );
        setComments(commentsData.length > 0 ? commentsData : initialComments);
        const normalizedReports =
          reportsData.length > 0 ? reportsData : initialReports;
        setReports(
          [...normalizedReports].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          )
        );

        // For now, keep initial data for other collections that need specific queries
        setPriceHistory(initialPriceHistory);
        setPortfolios(initialPortfolios);
        setNotifications(initialNotifications);

        // Set current user based on auth user (if sync didn't already set it)
        if (user) {
          let matchedUser =
            usersData.find(
              (u) =>
                u.email === user.email ||
                u.username === user.name ||
                u.id === user.id
            ) || null;

          if (!matchedUser) {
            try {
              const created = await userService.create({
                id: user.id,
                username:
                  user.name ||
                  user.email.split("@")[0] ||
                  `user-${Date.now().toString(36)}`,
                email: user.email,
                balance: 1000,
                isAdmin: false,
                createdAt: new Date(),
                bannedUntil: null,
                showNsfw: true,
                showSpoilers: true,
                isPortfolioPublic: false,
              });
              matchedUser = created;
              setUsers((prev) => [...prev, created]);
            } catch (e) {
              console.warn(
                "Failed to create user record for Appwrite account",
                e
              );
            }
          }

          if (matchedUser) setCurrentUser(matchedUser);
        } else if (initialUsers.length > 0) {
          setCurrentUser(initialUsers[0]);
        }
      } catch (error) {
        console.warn(
          "Failed to load from database, using initial data:",
          error
        );
        // Fallback to initial data
        setUsers(initialUsers);
        setStocks(initialStocks);
        setTransactions(initialTransactions);
        setPriceHistory(initialPriceHistory);
        setPortfolios(initialPortfolios);
        setComments(initialComments);
        setBuybackOffers(initialBuybackOffers);
        setNotifications(initialNotifications);
        setReports(
          [...initialReports].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          )
        );
        setCurrentUser(initialUsers[0] || null);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, authLoading]);

  // Real-time subscription for comments
  useEffect(() => {
    if (isLoading) return;

    const unsubscribe = databases.client.subscribe(
      `databases.${DATABASE_ID}.collections.${COMMENTS_COLLECTION}.documents`,
      (response) => {
        const event = response.events[0];
        const document = response.payload as any;

        if (event.includes("create")) {
          const newComment = mapComment(document);
          setComments((prev) => {
            // Check if we already have this comment (possibly as a temp comment)
            const existingIndex = prev.findIndex(
              (c) =>
                c.id === newComment.id || // Same ID
                (c.id.startsWith("temp-") && // Or temp comment with same content
                  c.userId === newComment.userId &&
                  c.content === newComment.content &&
                  c.animeId === newComment.animeId &&
                  c.parentId === newComment.parentId &&
                  Math.abs(
                    c.timestamp.getTime() - newComment.timestamp.getTime()
                  ) < 10000) // Within 10 seconds
            );

            if (existingIndex !== -1) {
              // Replace the existing comment (temp) with the real one
              // and update any replies that were pointing to the temporary ID
              const oldComment = prev[existingIndex];
              return prev.map((c) => {
                if (c.id === oldComment.id) {
                  // Replace the temp comment with the real one
                  return newComment;
                } else if (c.parentId === oldComment.id) {
                  // Update replies to point to the real parent ID
                  return { ...c, parentId: newComment.id };
                } else {
                  return c;
                }
              });
            } else {
              // Add as new comment
              return [...prev, newComment];
            }
          });
        } else if (event.includes("update")) {
          const updatedComment = mapComment(document);
          setComments((prev) =>
            prev.map((c) => (c.id === updatedComment.id ? updatedComment : c))
          );
        } else if (event.includes("delete")) {
          const deletedId = document.$id;
          setComments((prev) => prev.filter((c) => c.id !== deletedId));
        }
      }
    );

    return () => unsubscribe();
  }, [isLoading]);



  // Real-time subscription for stocks and price history so UI updates when database changes
  useEffect(() => {
    if (isLoading) return;

    const stockUnsub = databases.client.subscribe(
      `databases.${DATABASE_ID}.collections.${STOCKS_COLLECTION}.documents`,
      (response) => {
        const event = response.events[0];
        const document = response.payload as any;

        if (event.includes("create")) {
          const newStock = mapStock(document);
          setStocks((prev) => [...prev, newStock]);
        } else if (event.includes("update")) {
          const updatedStock = mapStock(document);
          setStocks((prev) => prev.map((s) => (s.id === updatedStock.id ? updatedStock : s)));
        } else if (event.includes("delete")) {
          const deletedId = document.$id;
          setStocks((prev) => prev.filter((s) => s.id !== deletedId));
        }
      }
    );

    const priceUnsub = databases.client.subscribe(
      `databases.${DATABASE_ID}.collections.${PRICE_HISTORY_COLLECTION}.documents`,
      (response) => {
        const event = response.events[0];
        const document = response.payload as any;

        if (event.includes("create")) {
          const newPH = mapPriceHistory(document);
          setPriceHistory((prev) => [...prev, newPH]);

          // Update current price on the corresponding stock for immediate UI reflection
          setStocks((prev) =>
            prev.map((s) => (s.id === newPH.stockId ? { ...s, currentPrice: newPH.price } : s))
          );
        }
      }
    );

    return () => {
      try { stockUnsub(); } catch {};
      try { priceUnsub(); } catch {};
    };
  }, [isLoading]);

  const buyStock = (stockId: string, shares: number): boolean => {
    if (!currentUser) return false;

    const stock = stocks.find((s) => s.id === stockId);
    if (!stock || stock.availableShares < shares) return false;

    const totalCost = stock.currentPrice * shares;
    if (currentUser.balance < totalCost) return false;

    // Update user balance
    const updatedUsers = users.map((u) =>
      u.id === currentUser.id ? { ...u, balance: u.balance - totalCost } : u
    );
    setUsers(updatedUsers);
    setCurrentUser({
      ...currentUser,
      balance: currentUser.balance - totalCost,
    });

    // Update stock available shares
    const updatedStocks = stocks.map((s) =>
      s.id === stockId
        ? { ...s, availableShares: s.availableShares - shares }
        : s
    );
    setStocks(updatedStocks);

    // Add transaction
    const newTransaction: Transaction = {
      id: `tx-${Date.now()}`,
      userId: currentUser.id,
      stockId,
      type: "buy",
      shares,
      pricePerShare: stock.currentPrice,
      totalAmount: totalCost,
      timestamp: new Date(),
    };
    setTransactions([...transactions, newTransaction]);

    // Update portfolio
    const existingPortfolio = portfolios.find(
      (p) => p.userId === currentUser.id && p.stockId === stockId
    );

    if (existingPortfolio) {
      const totalShares = existingPortfolio.shares + shares;
      const newAverageBuyPrice =
        (existingPortfolio.averageBuyPrice * existingPortfolio.shares +
          stock.currentPrice * shares) /
        totalShares;

      const updatedPortfolios = portfolios.map((p) =>
        p.userId === currentUser.id && p.stockId === stockId
          ? { ...p, shares: totalShares, averageBuyPrice: newAverageBuyPrice }
          : p
      );
      setPortfolios(updatedPortfolios);
    } else {
      setPortfolios([
        ...portfolios,
        {
          userId: currentUser.id,
          stockId,
          shares,
          averageBuyPrice: stock.currentPrice,
        },
      ]);
    }

    return true;
  };

  const sellStock = (stockId: string, shares: number): boolean => {
    if (!currentUser) return false;

    const portfolio = portfolios.find(
      (p) => p.userId === currentUser.id && p.stockId === stockId
    );
    if (!portfolio || portfolio.shares < shares) return false;

    const stock = stocks.find((s) => s.id === stockId);
    if (!stock) return false;

    const totalRevenue = stock.currentPrice * shares;

    // Update user balance
    const updatedUsers = users.map((u) =>
      u.id === currentUser.id ? { ...u, balance: u.balance + totalRevenue } : u
    );
    setUsers(updatedUsers);
    setCurrentUser({
      ...currentUser,
      balance: currentUser.balance + totalRevenue,
    });

    // Update stock available shares
    const updatedStocks = stocks.map((s) =>
      s.id === stockId
        ? { ...s, availableShares: s.availableShares + shares }
        : s
    );
    setStocks(updatedStocks);

    // Add transaction
    const newTransaction: Transaction = {
      id: `tx-${Date.now()}`,
      userId: currentUser.id,
      stockId,
      type: "sell",
      shares,
      pricePerShare: stock.currentPrice,
      totalAmount: totalRevenue,
      timestamp: new Date(),
    };
    setTransactions([...transactions, newTransaction]);

    // Update portfolio
    if (portfolio.shares === shares) {
      setPortfolios(
        portfolios.filter(
          (p) => !(p.userId === currentUser.id && p.stockId === stockId)
        )
      );
    } else {
      const updatedPortfolios = portfolios.map((p) =>
        p.userId === currentUser.id && p.stockId === stockId
          ? { ...p, shares: p.shares - shares }
          : p
      );
      setPortfolios(updatedPortfolios);
    }

    return true;
  };

  const createStock = (stock: Omit<Stock, "id" | "createdAt">) => {
    const newStock: Stock = {
      ...stock,
      id: `stock-${Date.now()}`,
      createdAt: new Date(),
    };
    setStocks([...stocks, newStock]);

    // Add initial price history
    const newPriceHistory: PriceHistory = {
      id: `ph-${Date.now()}`,
      stockId: newStock.id,
      price: newStock.currentPrice,
      timestamp: new Date(),
    };
    setPriceHistory([...priceHistory, newPriceHistory]);
  };

  const updateStockPrice = useCallback((stockId: string, newPrice: number) => {
    setStocks((prev) => prev.map((s) => (s.id === stockId ? { ...s, currentPrice: newPrice } : s)));

    // Add price history entry
    const newPriceHistory: PriceHistory = {
      id: `ph-${Date.now()}`,
      stockId,
      price: newPrice,
      timestamp: new Date(),
    };
    setPriceHistory((prev) => [...prev, newPriceHistory]);
  }, []);

  // Development-only market price simulator to create live ticks for the UI
  // Disabled by default. Set NEXT_PUBLIC_ENABLE_MARKET_SIM=true to enable local simulated ticks.
  useEffect(() => {
    if (isLoading) return;
    if (process.env.NEXT_PUBLIC_ENABLE_MARKET_SIM !== "true") return;

    const interval = setInterval(() => {
      if (stocks.length === 0) return;
      const idx = Math.floor(Math.random() * stocks.length);
      const stock = stocks[idx];
      // Random percent change between -1% and +1%
      const changePct = (Math.random() * 2 - 1) / 100;
      const newPrice = Math.max(0.01, Number((stock.currentPrice * (1 + changePct)).toFixed(2)));
      updateStockPrice(stock.id, newPrice);
    }, 2500);

    return () => clearInterval(interval);
  }, [isLoading, stocks, updateStockPrice]);

  const deleteStock = (stockId: string) => {
    setStocks(stocks.filter((s) => s.id !== stockId));
    setPriceHistory(priceHistory.filter((ph) => ph.stockId !== stockId));
    setPortfolios(portfolios.filter((p) => p.stockId !== stockId));
  };

  const banUser = async (
    userId: string,
    duration: "week" | "month" | "year" | "forever" | Date
  ) => {
    let bannedUntil: Date | null = null;

    if (duration === "forever") {
      bannedUntil = new Date("2099-12-31"); // Far future date for permanent ban
    } else if (duration instanceof Date) {
      bannedUntil = duration;
    } else {
      const now = new Date();
      switch (duration) {
        case "week":
          bannedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          bannedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          bannedUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    try {
      await userService.update(userId, { bannedUntil });
      const updatedUsers = users.map((u) =>
        u.id === userId ? { ...u, bannedUntil } : u
      );
      setUsers(updatedUsers);
      if (currentUser?.id === userId) {
        setCurrentUser({ ...currentUser, bannedUntil });
      }
    } catch (error) {
      console.error("Failed to ban user:", error);
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      await userService.update(userId, { bannedUntil: null });
      const updatedUsers = users.map((u) =>
        u.id === userId ? { ...u, bannedUntil: null } : u
      );
      setUsers(updatedUsers);
      if (currentUser?.id === userId) {
        setCurrentUser({ ...currentUser, bannedUntil: null });
      }
    } catch (error) {
      console.error("Failed to unban user:", error);
    }
  };

  const deleteUser = (userId: string) => {
    setUsers(users.filter((u) => u.id !== userId));
    setPortfolios(portfolios.filter((p) => p.userId !== userId));
    setTransactions(transactions.filter((t) => t.userId !== userId));
  };

  const getUserPortfolio = (userId: string): Portfolio[] => {
    return portfolios.filter((p) => p.userId === userId);
  };

  const getStockPriceHistory = (stockId: string): PriceHistory[] => {
    return priceHistory
      .filter((ph) => ph.stockId === stockId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  const getMarketData = (): MarketDataPoint[] => {
    // Group price history by date
    const dateMap = new Map<string, { prices: number[]; count: number }>();

    priceHistory.forEach((ph) => {
      const dateKey = ph.timestamp.toISOString().split("T")[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { prices: [], count: 0 });
      }
      const data = dateMap.get(dateKey)!;
      data.prices.push(ph.price);
      data.count++;
    });

    // Calculate market cap and average price for each date
    const marketData: MarketDataPoint[] = [];
    dateMap.forEach((data, dateKey) => {
      const totalMarketCap = data.prices.reduce((sum, price) => sum + price, 0);
      const averagePrice = totalMarketCap / data.count;
      marketData.push({
        timestamp: new Date(dateKey),
        totalMarketCap,
        averagePrice,
      });
    });

    return marketData.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  };

  const addComment = async ({
    animeId,
    content,
    characterId,
    parentId,
    tags = [],
  }: AddCommentInput) => {
    if (!currentUser) return;

    const normalizedTags = tags.filter(
      (tag): tag is ContentTag => tag === "nsfw" || tag === "spoiler"
    );

    // Create the comment object locally first
    const tempComment: Comment = {
      id: `temp-${Date.now()}`, // Temporary ID
      userId: currentUser.id,
      animeId,
      characterId,
      content,
      timestamp: new Date(),
      parentId,
      tags: normalizedTags,
      likedBy: [],
      dislikedBy: [],
    };

    // Add locally immediately for instant UI feedback
    setComments((prev) => [...prev, tempComment]);

    try {
      const newComment = await commentService.create({
        userId: currentUser.id,
        animeId,
        characterId,
        content,
        timestamp: new Date(),
        parentId,
        tags: normalizedTags,
        likedBy: [],
        dislikedBy: [],
      });

      // Replace the temporary comment with the real one
      setComments((prev) =>
        prev.map((c) => (c.id === tempComment.id ? newComment : c))
      );
    } catch (error) {
      console.warn("Failed to save comment to database:", error);
      // Remove the temporary comment on failure
      setComments((prev) => prev.filter((c) => c.id !== tempComment.id));
    }
  };

  const editComment = async (commentId: string, content: string) => {
    if (!currentUser) return;

    try {
      await commentService.update(commentId, { content });
      // The real-time subscription will handle the update
    } catch (error) {
      console.warn("Failed to update comment:", error);
      // Update locally
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content } : c))
      );
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!currentUser) return;

    try {
      await commentService.delete(commentId);
      // The real-time subscription will handle the deletion
    } catch (error) {
      console.warn("Failed to delete comment:", error);
      // Delete locally
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  const getAnimeComments = (animeId: string): Comment[] => {
    return comments
      .filter((c) => c.animeId === animeId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const getCharacterComments = (characterId: string): Comment[] => {
    return comments
      .filter((c) => c.characterId === characterId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const getMarketComments = (): Comment[] => {
    return comments
      .filter((c) => !c.animeId && !c.characterId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const toggleCommentReaction = async (
    commentId: string,
    reaction: "like" | "dislike"
  ) => {
    if (!currentUser) return;

    const applyReaction = (comment: Comment): Comment => {
      const likedBy = comment.likedBy ? [...comment.likedBy] : [];
      const dislikedBy = comment.dislikedBy ? [...comment.dislikedBy] : [];
      const hasLiked = likedBy.includes(currentUser.id);
      const hasDisliked = dislikedBy.includes(currentUser.id);

      if (reaction === "like") {
        const updatedLiked = hasLiked
          ? likedBy.filter((id) => id !== currentUser.id)
          : [...likedBy, currentUser.id];
        const updatedDisliked = hasDisliked
          ? dislikedBy.filter((id) => id !== currentUser.id)
          : dislikedBy;
        return {
          ...comment,
          likedBy: updatedLiked,
          dislikedBy: updatedDisliked,
        };
      } else {
        const updatedDisliked = hasDisliked
          ? dislikedBy.filter((id) => id !== currentUser.id)
          : [...dislikedBy, currentUser.id];
        const updatedLiked = hasLiked
          ? likedBy.filter((id) => id !== currentUser.id)
          : likedBy;
        return {
          ...comment,
          likedBy: updatedLiked,
          dislikedBy: updatedDisliked,
        };
      }
    };

    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? applyReaction(comment) : comment
      )
    );

    const targetComment = comments.find((c) => c.id === commentId);
    if (!targetComment) return;

    const updated = applyReaction(targetComment);

    try {
      await commentService.update(commentId, {
        likedBy: updated.likedBy,
        dislikedBy: updated.dislikedBy,
      });
    } catch (error) {
      console.warn("Failed to update reaction:", error);
      // revert
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? targetComment : comment
        )
      );
    }
  };

  const buildThreadContext = (targetCommentId: string): CommentSnapshot[] => {
    const commentMap = new Map(
      comments.map((comment) => [comment.id, comment])
    );
    const childrenMap = new Map<string, string[]>();

    comments.forEach((comment) => {
      if (!comment.parentId) return;
      const existing = childrenMap.get(comment.parentId) ?? [];
      existing.push(comment.id);
      childrenMap.set(comment.parentId, existing);
    });

    childrenMap.forEach((ids, parentId) => {
      ids.sort((a, b) => {
        const aTime = commentMap.get(a)?.timestamp.getTime() ?? 0;
        const bTime = commentMap.get(b)?.timestamp.getTime() ?? 0;
        return aTime - bTime;
      });
    });

    const findRootId = (commentId: string): string | null => {
      let current = commentMap.get(commentId);
      if (!current) return null;
      while (current.parentId) {
        const parent = commentMap.get(current.parentId);
        if (!parent) break;
        current = parent;
      }
      return current.id;
    };

    const rootId = findRootId(targetCommentId);
    if (!rootId) return [];

    const snapshots: CommentSnapshot[] = [];
    const traverse = (commentId: string) => {
      const node = commentMap.get(commentId);
      if (!node) return;
      snapshots.push({
        id: node.id,
        userId: node.userId,
        animeId: node.animeId ?? "",
        characterId: node.characterId,
        content: node.content,
        parentId: node.parentId,
        timestamp: node.timestamp,
        tags: node.tags ?? [],
      });
      const children = childrenMap.get(commentId) ?? [];
      children.forEach(traverse);
    };

    traverse(rootId);
    return snapshots;
  };

  const slugify = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const describeCommentLocation = (
    location?: { animeId: string; characterId?: string } | null
  ): string => {
    if (!location) return "the platform";
    if (location.characterId) {
      const stock = stocks.find((s) => s.id === location.characterId);
      if (stock) {
        return `${stock.characterName} (${stock.anime})`;
      }
      return `character thread (${location.characterId})`;
    }
    const stockMatch = stocks.find(
      (s) => slugify(s.anime) === location.animeId
    );
    return stockMatch ? stockMatch.anime : location.animeId;
  };

  const updateContentPreferences = async (preferences: {
    showNsfw?: boolean;
    showSpoilers?: boolean;
  }) => {
    if (!currentUser) return;

    try {
      const updatedUser = await userService.update(currentUser.id, preferences);
      setCurrentUser(updatedUser);
      setUsers((prev) =>
        prev.map((u) => (u.id === currentUser.id ? updatedUser : u))
      );
    } catch (error) {
      console.warn("Failed to update content preferences:", error);
      setCurrentUser((prev) => (prev ? { ...prev, ...preferences } : prev));
      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id ? { ...u, ...preferences } : u
        )
      );
    }
  };

  // Admin Functions
  const makeUserAdmin = async (userId: string) => {
    try {
      await userService.update(userId, { isAdmin: true });
      const updatedUsers = users.map((u) =>
        u.id === userId ? { ...u, isAdmin: true } : u
      );
      setUsers(updatedUsers);
      if (currentUser?.id === userId) {
        setCurrentUser({ ...currentUser, isAdmin: true });
      }
    } catch (error) {
      console.error("Failed to make user admin:", error);
    }
  };

  const removeUserAdmin = async (userId: string) => {
    try {
      await userService.update(userId, { isAdmin: false });
      const updatedUsers = users.map((u) =>
        u.id === userId ? { ...u, isAdmin: false } : u
      );
      setUsers(updatedUsers);
      if (currentUser?.id === userId) {
        setCurrentUser({ ...currentUser, isAdmin: false });
      }
    } catch (error) {
      console.error("Failed to remove user admin:", error);
    }
  };

  const giveUserMoney = (userId: string, amount: number) => {
    const updatedUsers = users.map((u) =>
      u.id === userId ? { ...u, balance: u.balance + amount } : u
    );
    setUsers(updatedUsers);
  };

  const takeUserMoney = (userId: string, amount: number) => {
    const updatedUsers = users.map((u) =>
      u.id === userId ? { ...u, balance: Math.max(0, u.balance - amount) } : u
    );
    setUsers(updatedUsers);
  };

  const giveUserStocks = (userId: string, stockId: string, shares: number) => {
    const stock = stocks.find((s) => s.id === stockId);
    if (!stock) return;

    const existingPortfolio = portfolios.find(
      (p) => p.userId === userId && p.stockId === stockId
    );

    if (existingPortfolio) {
      const totalShares = existingPortfolio.shares + shares;
      const newAverageBuyPrice =
        (existingPortfolio.averageBuyPrice * existingPortfolio.shares +
          stock.currentPrice * shares) /
        totalShares;

      const updatedPortfolios = portfolios.map((p) =>
        p.userId === userId && p.stockId === stockId
          ? { ...p, shares: totalShares, averageBuyPrice: newAverageBuyPrice }
          : p
      );
      setPortfolios(updatedPortfolios);
    } else {
      setPortfolios([
        ...portfolios,
        {
          userId,
          stockId,
          shares,
          averageBuyPrice: stock.currentPrice,
        },
      ]);
    }

    // Update available shares
    const updatedStocks = stocks.map((s) =>
      s.id === stockId
        ? { ...s, availableShares: Math.max(0, s.availableShares - shares) }
        : s
    );
    setStocks(updatedStocks);
  };

  const removeUserStocks = (
    userId: string,
    stockId: string,
    shares: number
  ) => {
    const portfolio = portfolios.find(
      (p) => p.userId === userId && p.stockId === stockId
    );
    if (!portfolio || portfolio.shares < shares) return;

    const updatedPortfolios = portfolios
      .map((p) =>
        p.userId === userId && p.stockId === stockId
          ? { ...p, shares: p.shares - shares }
          : p
      )
      .filter((p) => p.shares > 0);
    setPortfolios(updatedPortfolios);

    // Update available shares
    const updatedStocks = stocks.map((s) =>
      s.id === stockId
        ? { ...s, availableShares: s.availableShares + shares }
        : s
    );
    setStocks(updatedStocks);
  };

  const inflateMarket = (percentage: number) => {
    const multiplier = 1 + percentage / 100;
    const updatedStocks = stocks.map((stock) => ({
      ...stock,
      currentPrice: stock.currentPrice * multiplier,
    }));
    setStocks(updatedStocks);

    // Add price history for all stocks
    const newPriceHistory = stocks.map((stock) => ({
      id: `ph-${Date.now()}-${stock.id}`,
      stockId: stock.id,
      price: stock.currentPrice * multiplier,
      timestamp: new Date(),
    }));
    setPriceHistory([...priceHistory, ...newPriceHistory]);
  };

  const createBuybackOffer = (
    stockId: string,
    offeredPrice: number,
    targetUsers?: string[],
    expiresInHours: number = 24
  ) => {
    const timestamp = Date.now();
    const newOffer: BuybackOffer = {
      id: `buyback-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      stockId,
      offeredPrice,
      offeredBy: currentUser?.id || "admin",
      targetUsers,
      expiresAt: new Date(timestamp + expiresInHours * 60 * 60 * 1000),
      status: "active",
    };
    setBuybackOffers([...buybackOffers, newOffer]);

    // Send notifications to target users
    const targetUserIds = targetUsers || users.map((u) => u.id);
    targetUserIds.forEach((userId) => {
      sendNotification(
        userId,
        "buyback_offer",
        "Buyback Offer Available",
        `A buyback offer is available for ${
          stocks.find((s) => s.id === stockId)?.characterName
        } at $${offeredPrice.toFixed(2)} per share.`,
        { buybackOfferId: newOffer.id }
      );
    });
  };

  const acceptBuybackOffer = (offerId: string, shares: number) => {
    if (!currentUser) return;

    const offer = buybackOffers.find((o) => o.id === offerId);
    if (!offer || offer.status !== "active" || offer.expiresAt < new Date())
      return;

    const userPortfolio = portfolios.find(
      (p) => p.userId === currentUser.id && p.stockId === offer.stockId
    );
    if (!userPortfolio || userPortfolio.shares < shares) return;

    const totalAmount = offer.offeredPrice * shares;

    // Update user balance
    const updatedUsers = users.map((u) =>
      u.id === currentUser.id ? { ...u, balance: u.balance + totalAmount } : u
    );
    setUsers(updatedUsers);
    setCurrentUser({
      ...currentUser,
      balance: currentUser.balance + totalAmount,
    });

    // Update portfolio
    const updatedPortfolios = portfolios
      .map((p) =>
        p.userId === currentUser.id && p.stockId === offer.stockId
          ? { ...p, shares: p.shares - shares }
          : p
      )
      .filter((p) => p.shares > 0);
    setPortfolios(updatedPortfolios);

    // Update stock available shares
    const updatedStocks = stocks.map((s) =>
      s.id === offer.stockId
        ? { ...s, availableShares: s.availableShares + shares }
        : s
    );
    setStocks(updatedStocks);

    // Update offer
    const updatedOffers = buybackOffers.map((o) =>
      o.id === offerId
        ? {
            ...o,
            status: "accepted" as const,
            acceptedBy: currentUser.id,
            acceptedShares: shares,
          }
        : o
    );
    setBuybackOffers(updatedOffers);

    // Add transaction
    const newTransaction: Transaction = {
      id: `tx-${Date.now()}`,
      userId: currentUser.id,
      stockId: offer.stockId,
      type: "sell",
      shares,
      pricePerShare: offer.offeredPrice,
      totalAmount,
      timestamp: new Date(),
    };
    setTransactions([...transactions, newTransaction]);
  };

  const declineBuybackOffer = (offerId: string) => {
    const updatedOffers = buybackOffers.map((o) =>
      o.id === offerId ? { ...o, status: "declined" as const } : o
    );
    setBuybackOffers(updatedOffers);
  };

  const sendNotification = (
    userId: string,
    type: Notification["type"],
    title: string,
    message: string,
    data?: any
  ) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: new Date(),
    };
    setNotifications([...notifications, newNotification]);
  };

  const getUserNotifications = (userId: string): Notification[] => {
    return notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  const markNotificationRead = (notificationId: string) => {
    const updatedNotifications = notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    setNotifications(updatedNotifications);
  };

  // Report functions
  const reportComment = async (
    commentId: string,
    reason: Report["reason"],
    description?: string
  ) => {
    if (!currentUser) return;

    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    const threadContext = buildThreadContext(commentId);
    const commentLocation = {
      animeId: comment.animeId ?? "",
      characterId: comment.characterId,
    }; 

    try {
      const newReport = await reportService.create({
        reporterId: currentUser.id,
        reportedUserId: comment.userId,
        commentId,
        commentContent: comment.content,
        reason,
        description,
        status: "pending",
        createdAt: new Date(),
        threadContext,
        commentLocation,
      });
      setReports((prev) => [...prev, newReport]);
    } catch (error) {
      console.warn("Failed to create report:", error);
    }
  };

  const getReports = useCallback(async (): Promise<Report[]> => {
    try {
      const latestReports = await reportService.getAll();
      const sortedReports = latestReports.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      setReports(sortedReports);
      return sortedReports;
    } catch (error) {
      console.warn("Failed to refresh reports:", error);
      return reportsRef.current;
    }
  }, []);

  const resolveReport = async (
    reportId: string,
    resolution: "dismiss" | "warn" | "ban"
  ) => {
    if (!currentUser || !currentUser.isAdmin) return;

    const targetReport = reports.find((r) => r.id === reportId);
    if (!targetReport) return;

    const status = resolution === "dismiss" ? "dismissed" : "resolved";
    const now = new Date();

    try {
      await reportService.update(reportId, {
        status,
        resolvedAt: now,
        resolvedBy: currentUser.id,
        resolution,
      });
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status,
                resolvedAt: now,
                resolvedBy: currentUser.id,
                resolution,
              }
            : r
        )
      );

      if (resolution === "warn" || resolution === "ban") {
        const location =
          targetReport.commentLocation ||
          (() => {
            const comment = comments.find(
              (c) => c.id === targetReport.commentId
            );
            if (!comment) return undefined;
            return {
              animeId: comment.animeId ?? "",
              characterId: comment.characterId,
            };
          })();

        try {
          await deleteComment(targetReport.commentId);
        } catch (error) {
          console.warn("Failed to auto-delete reported comment:", error);
        }

        const actionVerb = resolution === "ban" ? "banned" : "warned";
        const locationText = describeCommentLocation(location);
        const detail = targetReport.description
          ? `Reason provided: ${targetReport.description}.`
          : "";
        sendNotification(
          targetReport.reportedUserId,
          "moderation",
          `You have been ${actionVerb}`,
          `On ${targetReport.createdAt.toLocaleString()}, your comment in ${locationText} violated our guidelines and has been removed. ${detail} Original message: "${
            targetReport.commentContent || "Unavailable"
          }".`,
          {
            reportId,
            commentId: targetReport.commentId,
            action: resolution,
            location,
          }
        );
      }
    } catch (error) {
      console.warn("Failed to resolve report:", error);
    }
  };

  // Message functions
  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string
    ): Promise<Message | null> => {
      if (!currentUser) return null;

      try {
        const message = await messageService.create({
          conversationId,
          senderId: currentUser.id,
          content,
        });

        // Add to local state
        setMessages((prev) => [...prev, message]);

        // Update conversation's last message
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  lastMessage: {
                    content,
                    senderId: currentUser.id,
                    timestamp: message.createdAt,
                  },
                  updatedAt: message.createdAt,
                }
              : conv
          )
        );

        return message;
      } catch (error) {
        console.error("Failed to send message:", error);
        return null;
      }
    },
    [currentUser]
  );

  const getConversationMessages = useCallback(
    async (conversationId: string): Promise<Message[]> => {
      try {
        const messages = await messageService.getConversationMessages(
          conversationId
        );
        // Update local state
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMessages = messages.filter((m) => !existingIds.has(m.id));
          return [...prev, ...newMessages];
        });
        return messages;
      } catch (error) {
        console.error("Failed to get conversation messages:", error);
        return [];
      }
    },
    []
  );

  const getUserConversations = useCallback(
    async (userId: string): Promise<Conversation[]> => {
      try {
        const conversations = await messageService.getUserConversations(userId);
        setConversations(conversations);
        return conversations;
      } catch (error) {
        console.error("Failed to get user conversations:", error);
        return [];
      }
    },
    []
  );

  const createConversation = (participantIds: string[]): string => {
    // Create a deterministic conversation ID based on participants
    const sortedIds = [...participantIds].sort();
    const conversationId = sortedIds.join("-");

    // Check if conversation already exists
    const existingConversation = conversations.find(
      (c) => c.id === conversationId
    );
    if (existingConversation) {
      return conversationId;
    }

    // Create new conversation
    const newConversation: Conversation = {
      id: conversationId,
      participants: sortedIds,
      lastMessage: {
        content: "",
        senderId: "",
        timestamp: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setConversations((prev) => [...prev, newConversation]);
    return conversationId;
  };

  const markMessagesAsRead = useCallback(
    async (conversationId: string, userId: string) => {
      try {
        const conversationMessages = messages.filter(
          (m) => m.conversationId === conversationId
        );
        const unreadMessageIds = conversationMessages
          .filter((m) => !m.readBy.includes(userId))
          .map((m) => m.id);

        if (unreadMessageIds.length > 0) {
          await messageService.markAsRead(unreadMessageIds, userId);

          // Update local state
          setMessages((prev) =>
            prev.map((message) =>
              message.conversationId === conversationId &&
              !message.readBy.includes(userId)
                ? { ...message, readBy: [...message.readBy, userId] }
                : message
            )
          );
        }
      } catch (error) {
        console.error("Failed to mark messages as read:", error);
      }
    },
    [messages]
  );

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isLoading,
        users,
        stocks,
        transactions,
        priceHistory,
        portfolios,
        comments,
        buybackOffers,
        notifications,
        reports,
        messages,
        conversations,
        buyStock,
        sellStock,
        createStock,
        updateStockPrice,
        deleteStock,
        banUser,
        unbanUser,
        deleteUser,
        getUserPortfolio,
        getStockPriceHistory,
        getMarketData,
        addComment,
        editComment,
        deleteComment,
        getAnimeComments,
        getCharacterComments,
        getMarketComments,
        toggleCommentReaction,
        updateContentPreferences,
        makeUserAdmin,
        removeUserAdmin,
        giveUserMoney,
        takeUserMoney,
        giveUserStocks,
        removeUserStocks,
        inflateMarket,
        createBuybackOffer,
        acceptBuybackOffer,
        declineBuybackOffer,
        sendNotification,
        getUserNotifications,
        markNotificationRead,
        reportComment,
        getReports,
        resolveReport,
        sendMessage,
        getConversationMessages,
        getUserConversations,
        createConversation,
        markMessagesAsRead,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
