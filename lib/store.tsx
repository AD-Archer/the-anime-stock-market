"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type {
  User,
  Stock,
  Transaction,
  PriceHistory,
  Portfolio,
  Comment,
  MarketDataPoint,
} from "./types";
import {
  initialUsers,
  initialStocks,
  initialTransactions,
  initialPriceHistory,
  initialPortfolios,
  initialComments,
} from "./data";

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
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(
    initialUsers[0] || null
  );
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [stocks, setStocks] = useState<Stock[]>(initialStocks);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [priceHistory, setPriceHistory] =
    useState<PriceHistory[]>(initialPriceHistory);
  const [portfolios, setPortfolios] = useState<Portfolio[]>(initialPortfolios);
  const [comments, setComments] = useState<Comment[]>(initialComments);

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
