"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
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
} from "./data";
import {
  userService,
  stockService,
  transactionService,
  portfolioService,
  priceHistoryService,
  commentService,
  buybackOfferService,
  notificationService,
} from "./database";

interface StoreContextType {
  // Current user
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Data
  users: User[];
  stocks: Stock[];
  transactions: Transaction[];
  priceHistory: PriceHistory[];
  portfolios: Portfolio[];
  comments: Comment[];
  buybackOffers: BuybackOffer[];
  notifications: Notification[];

  // Actions
  buyStock: (stockId: string, shares: number) => boolean;
  sellStock: (stockId: string, shares: number) => boolean;
  createStock: (stock: Omit<Stock, "id" | "createdAt">) => void;
  updateStockPrice: (stockId: string, newPrice: number) => void;
  deleteStock: (stockId: string) => void;
  banUser: (userId: string) => void;
  unbanUser: (userId: string) => void;
  deleteUser: (userId: string) => void;
  getUserPortfolio: (userId: string) => Portfolio[];
  getStockPriceHistory: (stockId: string) => PriceHistory[];
  getMarketData: () => MarketDataPoint[];
  addComment: (animeId: string, content: string, characterId?: string) => void;
  getAnimeComments: (animeId: string) => Comment[];
  getCharacterComments: (characterId: string) => Comment[];

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

  // Load data from database on mount
  useEffect(() => {
    if (authLoading) return;

    const loadData = async () => {
      try {
        console.log("Loading data from Appwrite...");
        const [usersData, stocksData, transactionsData, buybackOffersData] =
          await Promise.all([
            userService.getAll(),
            stockService.getAll(),
            transactionService.getAll(),
            buybackOfferService.getAll(),
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

        // For now, keep initial data for other collections that need specific queries
        setPriceHistory(initialPriceHistory);
        setPortfolios(initialPortfolios);
        setComments(initialComments);
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
                isBanned: false,
              });
              matchedUser = created;
              setUsers((prev) => [...prev, created]);
            } catch (e) {
              console.warn("Failed to create user record for Appwrite account", e);
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
        setCurrentUser(initialUsers[0] || null);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, authLoading]);

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

  const updateStockPrice = (stockId: string, newPrice: number) => {
    const updatedStocks = stocks.map((s) =>
      s.id === stockId ? { ...s, currentPrice: newPrice } : s
    );
    setStocks(updatedStocks);

    // Add price history entry
    const newPriceHistory: PriceHistory = {
      id: `ph-${Date.now()}`,
      stockId,
      price: newPrice,
      timestamp: new Date(),
    };
    setPriceHistory([...priceHistory, newPriceHistory]);
  };

  const deleteStock = (stockId: string) => {
    setStocks(stocks.filter((s) => s.id !== stockId));
    setPriceHistory(priceHistory.filter((ph) => ph.stockId !== stockId));
    setPortfolios(portfolios.filter((p) => p.stockId !== stockId));
  };

  const banUser = (userId: string) => {
    const updatedUsers = users.map((u) =>
      u.id === userId ? { ...u, isBanned: true } : u
    );
    setUsers(updatedUsers);
  };

  const unbanUser = (userId: string) => {
    const updatedUsers = users.map((u) =>
      u.id === userId ? { ...u, isBanned: false } : u
    );
    setUsers(updatedUsers);
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

  const addComment = (
    animeId: string,
    content: string,
    characterId?: string
  ) => {
    if (!currentUser) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      userId: currentUser.id,
      animeId,
      characterId,
      content,
      timestamp: new Date(),
    };
    setComments([...comments, newComment]);
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

  // Admin Functions
  const makeUserAdmin = (userId: string) => {
    const updatedUsers = users.map((u) =>
      u.id === userId ? { ...u, isAdmin: true } : u
    );
    setUsers(updatedUsers);
  };

  const removeUserAdmin = (userId: string) => {
    const updatedUsers = users.map((u) =>
      u.id === userId ? { ...u, isAdmin: false } : u
    );
    setUsers(updatedUsers);
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

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        stocks,
        transactions,
        priceHistory,
        portfolios,
        comments,
        buybackOffers,
        notifications,
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
        getAnimeComments,
        getCharacterComments,
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
