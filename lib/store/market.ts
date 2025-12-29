import type { StoreApi } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  BuybackOffer,
  DirectionalBet,
  MarketDataPoint,
  MediaType,
  Notification,
  Portfolio,
  PriceHistory,
  Stock,
  Transaction,
  User,
} from "../types";
import {
  portfolioService,
  stockService,
  transactionService,
  userService,
  priceHistoryService,
  buybackOfferService,
  characterSuggestionService,
  directionalBetService,
} from "../database";
import { toast } from "@/hooks/use-toast";
import type { StoreState } from "./types";
import { generateShortId } from "../utils";
import { canAddPremiumCharacter, DEFAULT_PREMIUM_META } from "../premium";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

const buildMarketData = (priceHistory: PriceHistory[]): MarketDataPoint[] => {
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

const applyPriceImpact = (stock: Stock, sharesDelta: number): number => {
  const direction = Math.sign(sharesDelta) || 1; // ensure 0 defaults to positive
  const liquidityFactor = Math.max(
    0.05,
    Math.min(0.5, Math.abs(sharesDelta) / stock.totalShares)
  );
  // Apply impact in the direction of the trade (buys raise price, sells lower it)
  const impact = liquidityFactor * 0.5 * direction; // scale to avoid extreme swings
  const newPrice = stock.currentPrice * (1 + impact);
  return Math.max(0.01, Number(newPrice.toFixed(2)));
};

const DEBUG_PRICE_HISTORY =
  process.env.NEXT_PUBLIC_DEBUG_PRICE_HISTORY === "1";

export function createMarketActions({
  setState,
  getState,
  sendNotification,
  unlockAward,
}: StoreMutators & {
  sendNotification: (
    userId: string,
    type: Notification["type"],
    title: string,
    message: string,
    data?: any
  ) => void;
  unlockAward: (
    userId: string,
    type: import("../types").Award["type"]
  ) => Promise<void>;
}) {
  type PriceHistoryLoadOptions = {
    limit?: number;
    minEntries?: number;
    force?: boolean;
  };

  const DEFAULT_IDLE_DELAY_MS = 1200;
  const DEFAULT_BATCH_SIZE = 4;
  const priceHistoryQueue = new Map<string, PriceHistoryLoadOptions>();
  let idleHandle: number | null = null;
  let isFlushingQueue = false;

  const priceHistoryInFlight = new Set<string>();

  const mergePriceHistoryEntries = (incoming: PriceHistory[]) => {
    if (!incoming.length) return;
    setState((state) => {
      const merged = new Map<string, PriceHistory>();
      state.priceHistory.forEach((ph) => merged.set(ph.id, ph));
      incoming.forEach((ph) => merged.set(ph.id, ph));
      return {
        priceHistory: Array.from(merged.values()).sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        ),
      };
    });
  };

  const mergeLoadOptions = (
    prev: PriceHistoryLoadOptions | undefined,
    next: PriceHistoryLoadOptions | undefined
  ): PriceHistoryLoadOptions => {
    if (!prev) return next ?? {};
    if (!next) return prev;
    return {
      limit: Math.max(prev.limit ?? 0, next.limit ?? 0) || undefined,
      minEntries:
        Math.max(prev.minEntries ?? 0, next.minEntries ?? 0) || undefined,
      force: Boolean(prev.force || next.force),
    };
  };

  const flushPriceHistoryQueue = async () => {
    if (isFlushingQueue) return;
    const batch = Array.from(priceHistoryQueue.entries()).slice(
      0,
      DEFAULT_BATCH_SIZE
    );
    if (!batch.length) return;
    isFlushingQueue = true;
    idleHandle = null;
    try {
      for (const [stockId, options] of batch) {
        priceHistoryQueue.delete(stockId);
        await ensurePriceHistoryForStocks([stockId], options);
      }
    } finally {
      isFlushingQueue = false;
      if (priceHistoryQueue.size > 0) {
        schedulePriceHistoryFlush();
      }
    }
  };

  const schedulePriceHistoryFlush = () => {
    if (idleHandle !== null) return;
    if (typeof window === "undefined") {
      flushPriceHistoryQueue().catch(() => {});
      return;
    }
    const requestIdle = (window as any)
      .requestIdleCallback as
      | ((cb: () => void, options?: { timeout?: number }) => number)
      | undefined;
    if (typeof requestIdle === "function") {
      idleHandle = requestIdle(
        () => {
          flushPriceHistoryQueue().catch(() => {});
        },
        { timeout: DEFAULT_IDLE_DELAY_MS }
      );
    } else {
      idleHandle = window.setTimeout(() => {
        flushPriceHistoryQueue().catch(() => {});
      }, DEFAULT_IDLE_DELAY_MS);
    }
  };

  const ensurePriceHistoryForStocks = async (
    stockIds: string[],
    options?: PriceHistoryLoadOptions
  ) => {
    const uniqueIds = Array.from(
      new Set(stockIds.filter((id): id is string => Boolean(id)))
    );
    if (!uniqueIds.length) return;

    const { limit = 200, minEntries = 2, force = false } = options ?? {};
    const counts = new Map<string, number>();
    if (!force) {
      getState().priceHistory.forEach((ph) => {
        counts.set(ph.stockId, (counts.get(ph.stockId) || 0) + 1);
      });
    }

    const targets = uniqueIds.filter((id) => {
      if (force) return !priceHistoryInFlight.has(id);
      const count = counts.get(id) || 0;
      return count < minEntries && !priceHistoryInFlight.has(id);
    });

    if (!targets.length) return;

    await Promise.all(
      targets.map(async (stockId) => {
        priceHistoryInFlight.add(stockId);
        try {
          const history = await priceHistoryService.getByStockId(
            stockId,
            limit
          );
          mergePriceHistoryEntries(history);
        } catch (error) {
          console.warn("Failed to load price history:", error);
        } finally {
          priceHistoryInFlight.delete(stockId);
        }
      })
    );
  };

  const schedulePriceHistoryLoad = (
    stockIds: string[],
    options?: PriceHistoryLoadOptions
  ) => {
    const uniqueIds = Array.from(
      new Set(stockIds.filter((id): id is string => Boolean(id)))
    );
    if (!uniqueIds.length) return;
    uniqueIds.forEach((stockId) => {
      const prev = priceHistoryQueue.get(stockId);
      priceHistoryQueue.set(stockId, mergeLoadOptions(prev, options));
    });
    schedulePriceHistoryFlush();
  };
  const notifyLiquidityRequest = (stock: Stock, requestedShares: number) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;

    const { portfolios, notifications } = getState();
    const holders = portfolios
      .filter(
        (p) =>
          p.stockId === stock.id && p.shares > 0 && p.userId !== currentUser.id
      )
      .map((p) => p.userId);

    const uniqueHolders = Array.from(new Set(holders));
    if (uniqueHolders.length === 0) return;

    const alreadyNotified = new Set(
      notifications
        .filter(
          (n) =>
            n.type === "liquidity_request" &&
            n.data?.stockId === stock.id &&
            n.data?.requestedBy === currentUser.id &&
            !n.read
        )
        .map((n) => n.userId)
    );

    const candidates = uniqueHolders.filter((id) => !alreadyNotified.has(id));
    if (candidates.length === 0) return;

    const premiumPct = 5 + Math.floor(Math.random() * 11);
    const offerPrice = Number(
      (stock.currentPrice * (1 + premiumPct / 100)).toFixed(2)
    );

    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, Math.min(3, shuffled.length));
    const buyerName = currentUser.username || "A trader";

    targets.forEach((userId) => {
      getState().sendNotification(
        userId,
        "liquidity_request",
        `${buyerName} wants ${stock.characterName} shares`,
        `${buyerName} wants to buy ${requestedShares} share${
          requestedShares === 1 ? "" : "s"
        } of ${stock.characterName} at $${offerPrice.toFixed(
          2
        )} (${premiumPct}% above market).`,
        {
          stockId: stock.id,
          requestedShares,
          offerPrice,
          premiumPct,
          requestedBy: currentUser.id,
        }
      );
    });
  };

  const getLastKnownEntry = (stockId: string): PriceHistory | null => {
    const history = getState().priceHistory
      .filter((ph) => ph.stockId === stockId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return history.at(-1) ?? null;
  };

  const getLastKnownPrice = (stockId: string): number | null => {
    const last = getLastKnownEntry(stockId)?.price;
    return last && last > 0 ? last : null;
  };

  // Price history entries are persisted for every real price change.
  // Note: "ph-init-*" entries are synthetic client boot data and should not
  // block persisting a real "previous" price when the first trade happens.
  const buildPriceHistoryEntries = (
    stockId: string,
    previousPrice: number,
    nextPrice: number
  ): PriceHistory[] => {
    const now = new Date();
    const entries: PriceHistory[] = [];
    const lastEntry = getLastKnownEntry(stockId);
    const lastKnown = lastEntry?.price ?? null;
    const hasPersistedHistory = lastEntry
      ? !lastEntry.id.startsWith("ph-init-")
      : false;

    if (
      previousPrice > 0 &&
      (!hasPersistedHistory ||
        !lastKnown ||
        Math.abs(lastKnown - previousPrice) > 0.0001)
    ) {
      entries.push({
        id: uuidv4(),
        stockId,
        price: previousPrice,
        timestamp: new Date(now.getTime() - 1),
      });
    }

    if (nextPrice > 0 && Math.abs(nextPrice - previousPrice) > 0.0001) {
      entries.push({
        id: uuidv4(),
        stockId,
        price: nextPrice,
        timestamp: now,
      });
    }

    if (DEBUG_PRICE_HISTORY) {
      console.info("[price_history.build]", {
        stockId,
        previousPrice,
        nextPrice,
        lastKnown,
        hasPersistedHistory,
        entries: entries.map((entry) => ({
          id: entry.id,
          price: entry.price,
          timestamp: entry.timestamp.toISOString(),
        })),
      });
    }

    return entries;
  };

  const checkAwards = async (userId: string) => {
    const state = getState();
    const user = state.users.find((u) => u.id === userId);
    if (!user) return;

    const userTransactions = state.transactions.filter(
      (t) => t.userId === userId
    );
    const userPortfolios = state.portfolios.filter((p) => p.userId === userId);
    const userComments = state.comments.filter((c) => c.userId === userId);
    const userAwards = state.awards.filter((a) => a.userId === userId);
    const unlockedTypes = new Set(userAwards.map((a) => a.type));

    // Check first_trade
    if (!unlockedTypes.has("first_trade") && userTransactions.length > 0) {
      await unlockAward(userId, "first_trade");
    }

    // Check profit milestones
    const totalProfit = userPortfolios.reduce((total, p) => {
      const stock = state.stocks.find((s) => s.id === p.stockId);
      if (!stock) return total;
      const currentValue = stock.currentPrice * p.shares;
      const invested = p.averageBuyPrice * p.shares;
      return total + (currentValue - invested);
    }, 0);

    if (!unlockedTypes.has("profit_milestone_100") && totalProfit >= 100) {
      await unlockAward(userId, "profit_milestone_100");
    }
    if (!unlockedTypes.has("profit_milestone_1000") && totalProfit >= 1000) {
      await unlockAward(userId, "profit_milestone_1000");
    }

    // Check portfolio value
    const portfolioValue = userPortfolios.reduce((total, p) => {
      const stock = state.stocks.find((s) => s.id === p.stockId);
      return total + (stock ? stock.currentPrice * p.shares : 0);
    }, 0);

    if (!unlockedTypes.has("portfolio_value_1000") && portfolioValue >= 1000) {
      await unlockAward(userId, "portfolio_value_1000");
    }
    if (
      !unlockedTypes.has("portfolio_value_10000") &&
      portfolioValue >= 10000
    ) {
      await unlockAward(userId, "portfolio_value_10000");
    }

    // Check diversified portfolio
    const uniqueStocks = new Set(userPortfolios.map((p) => p.stockId));
    if (!unlockedTypes.has("diversified_portfolio") && uniqueStocks.size >= 5) {
      await unlockAward(userId, "diversified_portfolio");
    }

    // Check comment master
    if (!unlockedTypes.has("comment_master") && userComments.length >= 50) {
      await unlockAward(userId, "comment_master");
    }

    // Early adopter (if user created before a certain date YYYY-MM-DD)
    const earlyAdopterDate = new Date("2026-03-01");
    if (
      !unlockedTypes.has("early_adopter") &&
      user.createdAt < earlyAdopterDate
    ) {
      await unlockAward(userId, "early_adopter");
    }

    // Top trader (ranked #1 on the leaderboard).
    // Matches the PlayerLeaderboard "richest" sort (portfolio value only).
    if (!unlockedTypes.has("top_trader")) {
      const portfolioValueByUser = new Map<string, number>();
      state.users.forEach((u) => {
        const value = state.portfolios
          .filter((p) => p.userId === u.id)
          .reduce((total, p) => {
            const stock = state.stocks.find((s) => s.id === p.stockId);
            return total + (stock ? stock.currentPrice * p.shares : 0);
          }, 0);
        portfolioValueByUser.set(u.id, value);
      });

      let maxValue = -Infinity;
      portfolioValueByUser.forEach((value) => {
        if (value > maxValue) maxValue = value;
      });

      const userValue = portfolioValueByUser.get(userId) ?? 0;
      if (Number.isFinite(maxValue) && userValue === maxValue && maxValue > 0) {
        await unlockAward(userId, "top_trader");
      }
    }
  };

  const buyStock = async (
    stockId: string,
    shares: number
  ): Promise<boolean> => {
    const authUser = getState().authUser;
    const currentUser = getState().currentUser;
    if (!authUser || !currentUser) return false;
    if (currentUser.bannedUntil && currentUser.bannedUntil > new Date())
      return false;

    // Capture snapshot to allow rollback if persistence fails
    const prevState = {
      users: getState().users,
      currentUser: getState().currentUser,
      stocks: getState().stocks,
      portfolios: getState().portfolios,
      transactions: getState().transactions,
      priceHistory: getState().priceHistory,
    };

    const { stocks, users, portfolios, transactions } = getState();
    const stock = stocks.find((s) => s.id === stockId);
    if (!stock) return false;
    if (stock.availableShares < shares) {
      if (stock.availableShares <= 0) {
        notifyLiquidityRequest(stock, shares);
      }
      return false;
    }

    const fallbackPrice = getLastKnownPrice(stockId) ?? 1;
    const basePrice =
      stock.currentPrice > 0 ? stock.currentPrice : fallbackPrice;
    const pricedStock =
      basePrice === stock.currentPrice
        ? stock
        : { ...stock, currentPrice: basePrice };
    const newPrice = applyPriceImpact(pricedStock, shares);
    const historyEntries = buildPriceHistoryEntries(
      stockId,
      pricedStock.currentPrice,
      newPrice
    );
    const executionPrice = newPrice;
    const totalCost = executionPrice * shares;
    if (currentUser.balance < totalCost) return false;

    const updatedUsers = users.map((u) =>
      u.id === currentUser.id ? { ...u, balance: u.balance - totalCost } : u
    );
    setState({
      users: updatedUsers,
      currentUser: { ...currentUser, balance: currentUser.balance - totalCost },
    });

    const updatedStocks = stocks.map((s) =>
      s.id === stockId
        ? {
            ...s,
            availableShares: s.availableShares - shares,
            currentPrice: newPrice,
          }
        : s
    );
    setState({ stocks: updatedStocks });
    if (historyEntries.length > 0) {
      setState((state) => ({
        priceHistory: [...state.priceHistory, ...historyEntries],
      }));
    }

    const newTransaction: Transaction = {
      id: generateShortId(),
      userId: currentUser.id,
      stockId,
      type: "buy",
      shares,
      pricePerShare: executionPrice,
      totalAmount: totalCost,
      timestamp: new Date(),
    };
    setState({ transactions: [...transactions, newTransaction] });

    const existingPortfolio = portfolios.find(
      (p) => p.userId === currentUser.id && p.stockId === stockId
    );

    if (existingPortfolio) {
      const totalShares = existingPortfolio.shares + shares;
      const newAverageBuyPrice =
        (existingPortfolio.averageBuyPrice * existingPortfolio.shares +
          executionPrice * shares) /
        totalShares;

      const updatedPortfolios = portfolios.map((p) =>
        p.userId === currentUser.id && p.stockId === stockId
          ? { ...p, shares: totalShares, averageBuyPrice: newAverageBuyPrice }
          : p
      );
      setState({ portfolios: updatedPortfolios });
    } else {
      setState({
        portfolios: [
          ...portfolios,
          {
            id: generateShortId(),
            userId: currentUser.id,
            stockId,
            shares,
            averageBuyPrice: executionPrice,
          },
        ],
      });
    }

    try {
      // For existing portfolio, query DB to get the actual document ID
      let portfolioPromise: Promise<any>;
      if (existingPortfolio) {
        const dbPortfolio = await portfolioService.getByUserAndStock(
          currentUser.id,
          stockId
        );
        if (dbPortfolio) {
          portfolioPromise = portfolioService.update(dbPortfolio.id, {
            userId: dbPortfolio.userId,
            stockId: dbPortfolio.stockId,
            shares: (dbPortfolio?.shares ?? 0) + shares,
            averageBuyPrice:
              ((dbPortfolio?.averageBuyPrice ?? 0) *
                (dbPortfolio?.shares ?? 0) +
                executionPrice * shares) /
              ((dbPortfolio?.shares ?? 0) + shares),
          });
        } else {
          portfolioPromise = Promise.resolve(existingPortfolio as any);
        }
      } else {
        portfolioPromise = portfolioService.create({
          id: generateShortId(),
          userId: currentUser.id,
          stockId,
          shares,
          averageBuyPrice: executionPrice,
        });
      }

      await Promise.all([
        stockService.update(stockId, {
          availableShares: stock.availableShares - shares,
          currentPrice: newPrice,
        }),
        userService.update(currentUser.id, {
          balance: currentUser.balance - totalCost,
        }),
        portfolioPromise,
        transactionService.create(newTransaction),
        ...historyEntries.map((entry) => priceHistoryService.create(entry)),
      ]);
      setState((state) => ({
        stocks: state.stocks.map((s) =>
          s.id === stockId ? { ...s, currentPrice: newPrice } : s
        ),
      }));
    } catch (error) {
      console.error(
        "Failed to persist buy transaction, reverting state:",
        error
      );
      // Rollback optimistic updates
      setState({
        users: prevState.users,
        currentUser: prevState.currentUser,
        stocks: prevState.stocks,
        portfolios: prevState.portfolios,
        transactions: prevState.transactions,
        priceHistory: prevState.priceHistory,
      });
      try {
        toast({
          title: "Transaction Failed",
          description:
            "Your buy could not be saved to the server. Your changes have been reverted.",
          variant: "destructive",
        });
      } catch (err) {
        console.warn("Failed to show toast for failed buy transaction:", err);
      }
      return false;
    }

    // Check for awards after successful transaction
    checkAwards(currentUser.id).catch((error) => {
      console.warn("Failed to check awards:", error);
    });

    // Check for early bird investor award (bought within 1 hour of stock creation)
    const { unlockAward } = getState();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (stock.createdAt >= oneHourAgo && unlockAward) {
      unlockAward(currentUser.id, "early_bird_investor").catch(() => {});
    }

    return true;
  };

  const sellStock = async (
    stockId: string,
    shares: number
  ): Promise<boolean> => {
    const currentUser = getState().currentUser;
    if (!currentUser) return false;
    if (currentUser.bannedUntil && currentUser.bannedUntil > new Date())
      return false;

    const { portfolios, stocks, users, transactions, priceHistory } =
      getState();
    const portfolio = portfolios.find(
      (p) => p.userId === currentUser.id && p.stockId === stockId
    );
    if (!portfolio || portfolio.shares < shares) return false;

    const stock = stocks.find((s) => s.id === stockId);
    if (!stock) return false;

    // Snapshot for rollback in case persistence fails
    const prevState = {
      users,
      currentUser,
      stocks,
      portfolios,
      transactions,
      priceHistory,
    };

    const fallbackPrice = getLastKnownPrice(stockId) ?? 1;
    const basePrice =
      stock.currentPrice > 0 ? stock.currentPrice : fallbackPrice;
    const pricedStock =
      basePrice === stock.currentPrice
        ? stock
        : { ...stock, currentPrice: basePrice };
    const newPrice = applyPriceImpact(pricedStock, -shares);
    const historyEntries = buildPriceHistoryEntries(
      stockId,
      pricedStock.currentPrice,
      newPrice
    );
    const executionPrice = newPrice;
    const totalRevenue = executionPrice * shares;

    const updatedUsers = users.map((u) =>
      u.id === currentUser.id ? { ...u, balance: u.balance + totalRevenue } : u
    );
    setState({
      users: updatedUsers,
      currentUser: {
        ...currentUser,
        balance: currentUser.balance + totalRevenue,
      },
    });

    const updatedStocks = stocks.map((s) =>
      s.id === stockId
        ? {
            ...s,
            availableShares: s.availableShares + shares,
            currentPrice: newPrice,
          }
        : s
    );
    setState({ stocks: updatedStocks });

    if (historyEntries.length > 0) {
      setState((state) => ({
        priceHistory: [...state.priceHistory, ...historyEntries],
      }));
    }

    const newTransaction: Transaction = {
      id: generateShortId(),
      userId: currentUser.id,
      stockId,
      type: "sell",
      shares,
      pricePerShare: executionPrice,
      totalAmount: totalRevenue,
      timestamp: new Date(),
    };
    setState({ transactions: [...transactions, newTransaction] });

    if (portfolio.shares === shares) {
      setState({
        portfolios: portfolios.filter(
          (p) => !(p.userId === currentUser.id && p.stockId === stockId)
        ),
      });
    } else {
      const updatedPortfolios = portfolios.map((p) =>
        p.userId === currentUser.id && p.stockId === stockId
          ? { ...p, shares: p.shares - shares }
          : p
      );
      setState({ portfolios: updatedPortfolios });
    }

    try {
      const newShareCount = portfolio.shares - shares;

      // Query for the actual portfolio document from DB to get its real ID
      const dbPortfolio = await portfolioService.getByUserAndStock(
        currentUser.id,
        stockId
      );

      const portfolioPromise =
        newShareCount > 0
          ? dbPortfolio
            ? portfolioService.update(dbPortfolio.id, {
                id: dbPortfolio.id,
                userId: dbPortfolio.userId,
                stockId: dbPortfolio.stockId,
                shares: newShareCount,
                averageBuyPrice: dbPortfolio.averageBuyPrice,
              })
            : Promise.resolve(portfolio as any)
          : dbPortfolio
          ? portfolioService.delete(dbPortfolio.id)
          : Promise.resolve();

      await Promise.all([
        stockService.update(stockId, {
          availableShares: stock.availableShares + shares,
          currentPrice: newPrice,
        }),
        userService.update(currentUser.id, {
          balance: currentUser.balance + totalRevenue,
        }),
        portfolioPromise,
        transactionService.create(newTransaction),
        ...historyEntries.map((entry) => priceHistoryService.create(entry)),
      ]);

      setState((state) => ({
        stocks: state.stocks.map((s) =>
          s.id === stockId ? { ...s, currentPrice: newPrice } : s
        ),
      }));
    } catch (error) {
      console.error(
        "Failed to persist sell transaction, reverting state:",
        error
      );
      // Rollback optimistic updates
      setState({
        users: prevState.users,
        currentUser: prevState.currentUser,
        stocks: prevState.stocks,
        portfolios: prevState.portfolios,
        transactions: prevState.transactions,
        priceHistory: prevState.priceHistory,
      });
      try {
        toast({
          title: "Transaction Failed",
          description:
            "Your sell could not be saved to the server. Your changes have been reverted.",
          variant: "destructive",
        });
      } catch (err) {
        console.warn("Failed to show toast for failed sell transaction:", err);
      }
      return false;
    }

    return true;
  };

  const placeDirectionalBet = async (
    stockId: string,
    type: DirectionalBet["type"],
    amount: number,
    expiryDays = 30
  ): Promise<boolean> => {
    const currentUser = getState().currentUser;
    if (!currentUser) return false;
    if (currentUser.bannedUntil && currentUser.bannedUntil > new Date())
      return false;

    const stock = getState().stocks.find((s) => s.id === stockId);
    if (!stock) return false;

    const betAmount = Number(amount);
    if (Number.isNaN(betAmount) || betAmount <= 0) return false;
    if (betAmount > currentUser.balance) return false;

    const now = new Date();
    const days = Math.max(1, expiryDays);
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const newBet: DirectionalBet = {
      id: generateShortId(),
      userId: currentUser.id,
      stockId,
      type,
      amount: betAmount,
      entryPrice: stock.currentPrice,
      createdAt: now,
      expiresAt,
      status: "open",
    };

    const prevState = {
      users: getState().users,
      currentUser,
      directionalBets: getState().directionalBets,
    };

    const newBalance = currentUser.balance - betAmount;

    setState((state) => ({
      users: state.users.map((user) =>
        user.id === currentUser.id ? { ...user, balance: newBalance } : user
      ),
      currentUser: { ...currentUser, balance: newBalance },
      directionalBets: [...state.directionalBets, newBet],
    }));

    try {
      await Promise.all([
        userService.update(currentUser.id, { balance: newBalance }),
        directionalBetService.create(newBet),
      ]);
      return true;
    } catch (error) {
      console.error("Failed to place directional bet:", error);
      setState({
        users: prevState.users,
        currentUser: prevState.currentUser,
        directionalBets: prevState.directionalBets,
      });
      toast({
        title: "Bet Failed",
        description:
          "Unable to place your call/put bet right now. Your balance has been restored.",
        variant: "destructive",
      });
      return false;
    }
  };

  const createStock = async (stock: Omit<Stock, "id" | "createdAt">) => {
    const { stocks, priceHistory, logAdminAction, users, sendNotification } =
      getState();
    const currentUser = getState().currentUser;
    if (!currentUser) {
      throw new Error("Please sign in to add new characters.");
    }

    const premiumMeta = currentUser.premiumMeta ?? DEFAULT_PREMIUM_META;
    const isAdmin = Boolean(currentUser.isAdmin);
    const isPremium = Boolean(premiumMeta.isPremium);
    if (!isAdmin && !isPremium) {
      throw new Error(
        "Only admins or premium members can create new characters."
      );
    }

    const mediaType: MediaType = (stock.mediaType || "anime") as MediaType;
    const stockPayload = { ...stock, mediaType };

    if (!isAdmin) {
      const { allowed, reason } = canAddPremiumCharacter(
        premiumMeta,
        mediaType
      );
      if (!allowed) {
        throw new Error(
          reason ?? "Your premium quota for today has been reached."
        );
      }
    }

    const incrementPremiumCharacterCount =
      getState().incrementPremiumCharacterCount;
    const addPremiumAdditions = getState().addPremiumAdditions;
    const autoAddEnabled = Boolean(premiumMeta.autoAdd);

    // Generate ID with retry logic to avoid collisions
    let newStock: Stock;
    let attempts = 0;
    do {
      newStock = {
        ...stockPayload,
        id: generateShortId(),
        createdAt: new Date(),
      };
      attempts++;
    } while (stocks.some((s) => s.id === newStock.id) && attempts < 10);

    if (attempts >= 10) {
      throw new Error("Failed to generate unique stock ID after 10 attempts");
    }

    // Double-check if stock already exists (in case of race condition)
    if (stocks.some((s) => s.id === newStock.id)) {
      console.warn("Stock already exists:", newStock.id);
      return;
    }

    // Check if a stock with the same character and anime already exists
    const existingStock = stocks.find(
      (s) =>
        s.characterName.toLowerCase() ===
          stockPayload.characterName.toLowerCase() &&
        s.anime.toLowerCase() === stockPayload.anime.toLowerCase()
    );
    if (existingStock) {
      if (!isAdmin && isPremium) {
        // For premium users, return early without consuming quota
        // The character already exists, so no need to add it again
        throw new Error(
          `${stockPayload.characterName} from ${stockPayload.anime} is already on the market and doesn't consume your quota.`
        );
      }
      // For admins, prevent duplicate creation
      throw new Error(
        `A stock for ${stockPayload.characterName} from ${stockPayload.anime} already exists`
      );
    }

    // Persist to database first
    try {
      await stockService.create(newStock);
    } catch (error) {
      console.error("Failed to persist stock to database:", error);
      throw error;
    }

    // Then update state - ensure no duplicates
    setState((state) => {
      const stockExists = state.stocks.some((s) => s.id === newStock.id);
      return {
        stocks: stockExists ? state.stocks : [...state.stocks, newStock],
      };
    });

    const newPriceHistory: PriceHistory = {
      id: uuidv4(),
      stockId: newStock.id,
      price: newStock.currentPrice,
      timestamp: new Date(),
    };
    setState({ priceHistory: [...priceHistory, newPriceHistory] });

    // Persist price history
    try {
      await priceHistoryService.create(newPriceHistory);
    } catch (error) {
      console.error("Failed to persist price history:", error);
    }

    const createdByRole = isAdmin
      ? isPremium
        ? "admin+premium"
        : "admin"
      : isPremium
      ? "premium"
      : "user";

    logAdminAction("stock_creation", newStock.createdBy, {
      stockId: newStock.id,
      characterName: newStock.characterName,
      anime: newStock.anime,
      initialPrice: newStock.currentPrice,
      createdByRole,
      creationSource: newStock.source ?? "manual",
    });

    // Broadcast IPO notification to all users
    users.forEach((u) => {
      sendNotification(
        u.id,
        "stock_ipo",
        `New IPO: ${newStock.characterName}`,
        `${newStock.characterName} (${
          newStock.anime
        }) just listed at $${newStock.currentPrice.toFixed(2)}.`,
        {
          stockId: newStock.id,
          anime: newStock.anime,
          price: newStock.currentPrice,
        }
      );
    });

    if (isPremium && incrementPremiumCharacterCount) {
      try {
        await incrementPremiumCharacterCount(currentUser.id, mediaType, 1, 0);
        await addPremiumAdditions?.(currentUser.id, [
          {
            stockId: newStock.id,
            characterName: newStock.characterName,
            characterSlug: newStock.characterSlug,
            anime: newStock.anime,
            imageUrl: newStock.imageUrl,
            mediaType,
            status: "added",
            source: newStock.source === "anilist" ? "anilist" : "manual",
          },
        ]);
      } catch (error) {
        console.error("Failed to update premium character usage:", error);
      }
    }

    if (!isAdmin && isPremium && autoAddEnabled) {
      const suggestions = getState().characterSuggestions;
      const normalizedCharacter = stockPayload.characterName
        .toLowerCase()
        .trim();
      const normalizedAnime = stockPayload.anime.toLowerCase().trim();
      const match = suggestions.find(
        (suggestion) =>
          suggestion.status !== "approved" &&
          suggestion.characterName.toLowerCase().trim() ===
            normalizedCharacter &&
          suggestion.anime.toLowerCase().trim() === normalizedAnime
      );
      if (match) {
        try {
          const updatedSuggestion = await characterSuggestionService.update(
            match.id,
            {
              status: "approved",
              reviewedAt: new Date(),
              reviewedBy: currentUser.id,
              stockId: newStock.id,
              resolutionNotes: "Auto-approved via premium creation.",
              autoImportStatus: "succeeded",
              autoImportMessage: "Premium member added this character.",
            }
          );
          setState((state) => ({
            characterSuggestions: state.characterSuggestions.map((s) =>
              s.id === match.id ? updatedSuggestion : s
            ),
          }));
          if (match.userId) {
            sendNotification(
              match.userId,
              "character_suggestion",
              "Suggestion auto-approved",
              `${match.characterName} is now on the market thanks to premium creation.`,
              {
                suggestionId: match.id,
                stockId: newStock.id,
                status: "approved",
              }
            );
          }
        } catch (error) {
          console.error("Failed to auto-approve suggestion:", error);
        }
      }
    }
  };

  const updateStockPrice = (stockId: string, newPrice: number) => {
    const { stocks, portfolios, logAdminAction } = getState();
    const stock = stocks.find((s) => s.id === stockId);
    if (!stock) return;

    const valueAdjustmentRatio = stock.currentPrice / newPrice;
    const ownedShares = portfolios
      .filter((p) => p.stockId === stockId)
      .reduce((sum, p) => sum + p.shares, 0);

    // Adjust portfolios: multiply shares by value adjustment ratio
    // Use precise calculation to preserve total value
    let totalAssignedShares = 0;
    const updatedPortfolios = portfolios.map((p, index) => {
      if (p.stockId !== stockId) return p;

      const exactNewShares = p.shares * valueAdjustmentRatio;
      const newShares = Math.round(exactNewShares);
      totalAssignedShares += newShares;
      return { ...p, shares: newShares };
    });

    // Adjust for rounding errors by giving remaining shares to first portfolio
    const expectedTotalShares = Math.round(ownedShares * valueAdjustmentRatio);
    const roundingError = expectedTotalShares - totalAssignedShares;

    if (
      roundingError !== 0 &&
      updatedPortfolios.some((p) => p.stockId === stockId)
    ) {
      const firstPortfolio = updatedPortfolios.find(
        (p) => p.stockId === stockId
      )!;
      firstPortfolio.shares += roundingError;
      totalAssignedShares += roundingError;
    }

    // Calculate additional shares needed to support all adjusted portfolios
    const sharesRequiredForPortfolios = updatedPortfolios
      .filter((p) => p.stockId === stockId)
      .reduce((sum, p) => sum + p.shares, 0);

    const additionalSharesNeeded = Math.max(
      0,
      sharesRequiredForPortfolios - stock.availableShares
    );

    // Update stock with new price and additional shares if needed
    const newTotalShares = stock.totalShares + additionalSharesNeeded;
    const newAvailableShares = stock.availableShares + additionalSharesNeeded;

    const priceHistoryEntry: PriceHistory = {
      id: uuidv4(),
      stockId,
      price: newPrice,
      timestamp: new Date(),
    };

    setState((state) => ({
      stocks: state.stocks.map((s) =>
        s.id === stockId
          ? {
              ...s,
              currentPrice: newPrice,
              totalShares: newTotalShares,
              availableShares: newAvailableShares,
            }
          : s
      ),
      portfolios: updatedPortfolios,
      priceHistory: [...state.priceHistory, priceHistoryEntry],
    }));

    // Persist portfolio changes to database
    updatedPortfolios
      .filter((p) => p.stockId === stockId)
      .forEach((portfolio) => {
        portfolioService
          .update(portfolio.id, { shares: portfolio.shares })
          .catch((error) => {
            console.error("Failed to update portfolio in database:", error);
          });
      });

    // Persist stock changes to database
    stockService
      .update(stockId, {
        currentPrice: newPrice,
        totalShares: newTotalShares,
        availableShares: newAvailableShares,
      })
      .catch((error) => {
        console.error("Failed to update stock in database:", error);
      });

    priceHistoryService.create(priceHistoryEntry).catch((error) => {
      console.error("Failed to persist price history entry:", error);
    });

    logAdminAction("stock_grant", stock.createdBy, {
      action: "price_normalization",
      stockId,
      oldPrice: stock.currentPrice,
      newPrice,
      valueAdjustmentRatio,
      additionalSharesCreated: additionalSharesNeeded,
      affectedPortfolios: updatedPortfolios.filter((p) => p.stockId === stockId)
        .length,
    });
  };

  const deleteStock = async (stockId: string) => {
    const {
      stocks,
      priceHistory,
      portfolios,
      logAdminAction,
      users,
      sendNotification,
      currentUser,
    } = getState();
    const stock = stocks.find((s) => s.id === stockId);
    if (!stock) return;

    // Find all portfolio holders for this stock
    const stockHolders = portfolios.filter((p) => p.stockId === stockId);

    // Calculate compensation for each holder
    const compensationMap = new Map<string, number>();
    stockHolders.forEach((portfolio) => {
      const compensationAmount = portfolio.shares * stock.currentPrice;
      compensationMap.set(
        portfolio.userId,
        (compensationMap.get(portfolio.userId) || 0) + compensationAmount
      );
    });

    // Update user balances with compensation
    const updatedUsers = users.map((u) => {
      const compensation = compensationMap.get(u.id) || 0;
      return compensation > 0 ? { ...u, balance: u.balance + compensation } : u;
    });

    // Update current user if they received compensation
    const currentUserCompensation =
      compensationMap.get(currentUser?.id || "") || 0;
    const updatedCurrentUser =
      currentUserCompensation > 0
        ? {
            ...currentUser!,
            balance: currentUser!.balance + currentUserCompensation,
          }
        : currentUser;

    // Update state: remove stock, price history, portfolios, and update users
    setState({
      stocks: stocks.filter((s) => s.id !== stockId),
      priceHistory: priceHistory.filter((ph) => ph.stockId !== stockId),
      portfolios: portfolios.filter((p) => p.stockId !== stockId),
      users: updatedUsers,
      ...(updatedCurrentUser && { currentUser: updatedCurrentUser }),
    });

    // Delete from database
    try {
      await stockService.delete(stockId);
    } catch (error) {
      console.error("Failed to delete stock from database:", error);
    }

    // Log admin action
    logAdminAction("stock_removal", currentUser?.id || "unknown", {
      stockId,
      characterName: stock.characterName,
      affectedUsers: stockHolders.length,
      totalCompensation: Array.from(compensationMap.values()).reduce(
        (sum, val) => sum + val,
        0
      ),
    });

    // Send notifications to all affected users
    const notificationTitle = `${stock.characterName} Stock Delisted`;
    const compensationPerUser = (stockId: string) => {
      return compensationMap.get(stockId) || 0;
    };

    stockHolders.forEach((portfolio) => {
      const compensation = compensationMap.get(portfolio.userId) || 0;
      const shares = portfolio.shares;
      const message =
        compensation > 0
          ? `Your holdings of ${
              stock.characterName
            } have been delisted. You held ${shares} share${
              shares === 1 ? "" : "s"
            }. You have been compensated $${compensation.toFixed(
              2
            )} at the current market price.`
          : `${stock.characterName} has been delisted from the market.`;

      sendNotification(
        portfolio.userId,
        "admin_message",
        notificationTitle,
        message,
        {
          stockId,
          characterName: stock.characterName,
          sharesHeld: shares,
          compensationAmount: compensation,
          originalPrice: stock.currentPrice,
        }
      );
    });

    // Send system-wide notification about the delisting
    const systemMessage = `The ${stock.characterName} stock from ${stock.anime} has been delisted from the market. All shareholders have been fairly compensated at the current market price.`;
    getState().users.forEach((user) => {
      if (!compensationMap.has(user.id)) {
        // Only notify non-shareholders of the general delisting
        sendNotification(
          user.id,
          "admin_message",
          notificationTitle,
          systemMessage,
          {
            stockId,
            characterName: stock.characterName,
            type: "stock_delisted",
          }
        );
      }
    });
  };

  const createShares = (stockId: string, newShareCount: number) => {
    const { stocks, priceHistory, logAdminAction, portfolios, unlockAward } =
      getState();
    const stock = stocks.find((s) => s.id === stockId);
    if (!stock || newShareCount <= 0) return;

    const shareDilutionFactor = newShareCount / stock.totalShares;
    const newPrice = stock.currentPrice / (1 + shareDilutionFactor);
    const totalNewShares = stock.totalShares + newShareCount;

    const adjustedPrice = Number(newPrice.toFixed(2));
    const priceHistoryEntry: PriceHistory = {
      id: uuidv4(),
      stockId,
      price: adjustedPrice,
      timestamp: new Date(),
    };

    setState((state) => ({
      stocks: state.stocks.map((s) =>
        s.id === stockId
          ? {
              ...s,
              totalShares: totalNewShares,
              availableShares: s.availableShares + newShareCount,
              currentPrice: adjustedPrice,
            }
          : s
      ),
      priceHistory: [...state.priceHistory, priceHistoryEntry],
    }));

    stockService
      .update(stockId, {
        totalShares: totalNewShares,
        availableShares: stock.availableShares + newShareCount,
        currentPrice: adjustedPrice,
      })
      .catch((error) => {
        console.error("Failed to update stock in database:", error);
      });

    priceHistoryService.create(priceHistoryEntry).catch((error) => {
      console.error("Failed to persist price history entry:", error);
    });

    logAdminAction("stock_grant", stock.createdBy, {
      action: "shares_created",
      stockId,
      newShareCount,
      totalNewShares,
      oldPrice: stock.currentPrice,
      newPrice: adjustedPrice,
      dilutionFactor: Number((shareDilutionFactor * 100).toFixed(2)),
    });

    // Unlock dilution survivor award for all users holding this stock
    if (unlockAward) {
      const stockHolders = portfolios.filter((p) => p.stockId === stockId);
      stockHolders.forEach((portfolio) => {
        unlockAward(portfolio.userId, "stock_dilution_survivor").catch(
          () => {}
        );
      });
    }
  };

  const massCreateShares = async (
    shareCount: number,
    dilutePrices: boolean = true,
    onProgress?: (progress: {
      current: number;
      total: number;
      message: string;
    }) => void
  ) => {
    const { stocks, priceHistory, logAdminAction, portfolios, unlockAward } =
      getState();

    if (shareCount <= 0) return;

    onProgress?.({
      current: 0,
      total: stocks.length,
      message: "Starting mass dilution...",
    });

    // Calculate dilution for each stock
    const updatedStocks = stocks.map((stock, index) => {
      if (dilutePrices) {
        const shareDilutionFactor = shareCount / stock.totalShares;
        const newPrice = stock.currentPrice / (1 + shareDilutionFactor);
        const totalNewShares = stock.totalShares + shareCount;

        onProgress?.({
          current: index + 1,
          total: stocks.length,
          message: `Processing ${stock.characterName}...`,
        });

        return {
          ...stock,
          totalShares: totalNewShares,
          availableShares: stock.availableShares + shareCount,
          currentPrice: Number(newPrice.toFixed(2)),
        };
      } else {
        // No dilution - just add shares without changing price
        onProgress?.({
          current: index + 1,
          total: stocks.length,
          message: `Processing ${stock.characterName}...`,
        });

        return {
          ...stock,
          totalShares: stock.totalShares + shareCount,
          availableShares: stock.availableShares + shareCount,
        };
      }
    });

    onProgress?.({
      current: stocks.length,
      total: stocks.length,
      message: "Updating stock data...",
    });

    // Create a single mass dilution price history entry instead of individual entries
    const massDilutionEntry = dilutePrices
      ? {
          id: `mass-dilution-${Date.now()}`,
          stockId: "mass-dilution", // Special ID to indicate mass operation
          price: 0, // Not applicable for mass dilution
          timestamp: new Date(),
          metadata: {
            type: "mass_dilution",
            shareCount,
            stocksAffected: updatedStocks.length,
            totalSharesAdded: updatedStocks.length * shareCount,
            averageDilutionFactor: dilutePrices
              ? Number(
                  (
                    (shareCount /
                      stocks.reduce((sum, s) => sum + s.totalShares, 0)) *
                    100
                  ).toFixed(2)
                )
              : 0,
          },
        }
      : null;

    const priceHistoryEntries = dilutePrices
      ? updatedStocks.map((stock) => ({
          id: uuidv4(),
          stockId: stock.id,
          price: stock.currentPrice,
          timestamp: new Date(),
        }))
      : [];

    setState((state) => ({
      stocks: updatedStocks,
      priceHistory: [
        ...state.priceHistory,
        ...priceHistoryEntries,
        ...(massDilutionEntry ? [massDilutionEntry] : []),
      ],
    }));

    onProgress?.({
      current: stocks.length,
      total: stocks.length,
      message: "Logging admin action...",
    });

    // Log a single admin action for the mass operation with retry logic
    const currentUser = getState().currentUser;
    if (currentUser) {
      let retryCount = 0;
      const maxRetries = 3;
      const retryDelay = 2000; // 2 seconds

      while (retryCount < maxRetries) {
        try {
          await logAdminAction("stock_grant", currentUser.id, {
            action: dilutePrices
              ? "mass_shares_created_with_dilution"
              : "mass_shares_created_no_dilution",
            totalStocksAffected: updatedStocks.length,
            sharesAddedPerStock: shareCount,
            totalSharesAdded: updatedStocks.length * shareCount,
            dilutionEnabled: dilutePrices,
            massDilutionEntryId: massDilutionEntry?.id,
            timestamp: new Date().toISOString(),
          });

          onProgress?.({
            current: stocks.length,
            total: stocks.length,
            message: "Admin action logged successfully",
          });
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          console.warn(
            `Failed to log admin action for mass share creation (attempt ${retryCount}/${maxRetries}):`,
            error
          );

          if (retryCount < maxRetries) {
            onProgress?.({
              current: stocks.length,
              total: stocks.length,
              message: `Rate limited, retrying in ${
                retryDelay / 1000
              }s... (${retryCount}/${maxRetries})`,
            });
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          } else {
            onProgress?.({
              current: stocks.length,
              total: stocks.length,
              message:
                "Failed to log admin action after retries, but operation completed",
            });
            // Don't fail the entire operation if logging fails due to rate limits
          }
        }
      }
    }

    onProgress?.({
      current: stocks.length,
      total: stocks.length,
      message: "Unlocking awards...",
    });

    // Unlock dilution survivor award for all users holding any stock with retry logic
    if (unlockAward) {
      const allStockHolders = portfolios.filter((p) =>
        stocks.some((s) => s.id === p.stockId)
      );
      const uniqueHolders = Array.from(
        new Set(allStockHolders.map((p) => p.userId))
      );

      let awardUnlockCount = 0;
      for (const userId of uniqueHolders) {
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            await unlockAward(userId, "stock_dilution_survivor");
            awardUnlockCount++;
            onProgress?.({
              current: awardUnlockCount,
              total: uniqueHolders.length,
              message: `Unlocked award for ${awardUnlockCount}/${uniqueHolders.length} users`,
            });
            break; // Success, exit retry loop
          } catch (error) {
            retryCount++;
            console.warn(
              `Failed to unlock award for user ${userId} (attempt ${retryCount}/${maxRetries}):`,
              error
            );

            if (retryCount < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay for awards
            }
          }
        }
      }
    }

    onProgress?.({
      current: stocks.length,
      total: stocks.length,
      message: "Mass dilution completed!",
    });

    try {
      const batchSize = 25;
      const pause = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      for (let i = 0; i < updatedStocks.length; i += batchSize) {
        const stockBatch = updatedStocks.slice(i, i + batchSize);
        const historyBatch = priceHistoryEntries.slice(i, i + batchSize);

        await Promise.all([
          ...stockBatch.map((stock) =>
            stockService.update(stock.id, {
              totalShares: stock.totalShares,
              availableShares: stock.availableShares,
              ...(dilutePrices ? { currentPrice: stock.currentPrice } : {}),
            })
          ),
          ...(dilutePrices
            ? historyBatch.map((entry) => priceHistoryService.create(entry))
            : []),
        ]);

        if (i + batchSize < updatedStocks.length) {
          await pause(200);
        }
      }
    } catch (error) {
      console.error("Failed to persist mass dilution updates:", error);
    }
  };

  const getUserPortfolio = (userId: string): Portfolio[] => {
    const aggregated = new Map<string, Portfolio>();
    getState()
      .portfolios.filter((p) => p.userId === userId)
      .forEach((portfolio) => {
        const existing = aggregated.get(portfolio.stockId);
        if (!existing) {
          aggregated.set(portfolio.stockId, { ...portfolio });
          return;
        }

        const combinedShares = existing.shares + portfolio.shares;
        const combinedAverage =
          combinedShares === 0
            ? 0
            : (existing.averageBuyPrice * existing.shares +
                portfolio.averageBuyPrice * portfolio.shares) /
              combinedShares;

        aggregated.set(portfolio.stockId, {
          ...existing,
          shares: combinedShares,
          averageBuyPrice: combinedAverage,
        });
      });

    return Array.from(aggregated.values());
  };

  const getStockPriceHistory = (stockId: string): PriceHistory[] => {
    return getState()
      .priceHistory.filter((ph) => ph.stockId === stockId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  const getMarketData = (): MarketDataPoint[] =>
    buildMarketData(getState().priceHistory);

  const setMarketDriftEnabled = (enabled: boolean) => {
    setState({ marketDriftEnabled: enabled });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("market:driftEnabled", enabled ? "1" : "0");
      } catch (storageError) {
        console.warn("Failed to persist market drift toggle:", storageError);
      }
    }
  };

  const triggerMarketDriftNow = async () => {
    await applyDailyMarketDrift({ force: true });
  };

  const applyDailyMarketDrift = async (options?: {
    force?: boolean;
  }): Promise<void> => {
    const { stocks, priceHistory, lastMarketDriftAt, marketDriftEnabled } =
      getState();
    if (stocks.length === 0) return;
    if (!marketDriftEnabled && !options?.force) return;

    const prevStocks = stocks;
    const prevPriceHistory = priceHistory;
    const prevDrift = lastMarketDriftAt;

    // Bias toward slow growth with a tiny per-day drift and small symmetric noise
    const baseDrift = 0.0002 + Math.random() * 0.0003; // 0.02% to 0.05%
    const now = new Date();

    const stockUpdates = stocks.map((stock) => {
      const noise = (Math.random() - 0.5) * 0.002; // -0.1% to +0.1%
      const drift = baseDrift + noise;
      const multiplier = 1 + drift;
      const updatedPrice = Math.max(
        0.01,
        Number((stock.currentPrice * multiplier).toFixed(2))
      );
      return { stockId: stock.id, updatedPrice };
    });

    // Drift persists price history alongside stock updates to keep % change consistent.
    const priceHistoryEntries = stockUpdates.map((update) => ({
      id: uuidv4(),
      stockId: update.stockId,
      price: update.updatedPrice,
      timestamp: now,
    }));

    setState((state) => ({
      stocks: state.stocks.map((stock) => {
        const update = stockUpdates.find((u) => u.stockId === stock.id);
        return update ? { ...stock, currentPrice: update.updatedPrice } : stock;
      }),
      priceHistory: [...state.priceHistory, ...priceHistoryEntries],
      lastMarketDriftAt: now,
    }));

    try {
      const batchSize = 25;
      const pause = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      for (let i = 0; i < stockUpdates.length; i += batchSize) {
        const stockBatch = stockUpdates.slice(i, i + batchSize);
        const historyBatch = priceHistoryEntries.slice(i, i + batchSize);

        await Promise.all([
          ...stockBatch.map((update) =>
            stockService.update(update.stockId, {
              currentPrice: update.updatedPrice,
            })
          ),
          ...historyBatch.map((entry) => priceHistoryService.create(entry)),
        ]);

        // Small pause between batches to avoid Appwrite rate limits
        if (i + batchSize < stockUpdates.length) {
          await pause(200);
        }
      }

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("market:lastDriftAt", now.toISOString());
        } catch (storageError) {
          console.warn(
            "Failed to persist daily market drift timestamp:",
            storageError
          );
        }
      }
    } catch (error) {
      console.error("Failed to apply daily market drift:", error);
      setState({
        stocks: prevStocks,
        priceHistory: prevPriceHistory,
        lastMarketDriftAt: prevDrift ?? null,
      });
    }
  };

  const inflateMarket = (percentage: number) => {
    const { stocks, priceHistory, logAdminAction } = getState();
    const multiplier = 1 + percentage / 100;
    const updatedStocks = stocks.map((stock) => ({
      ...stock,
      currentPrice: stock.currentPrice * multiplier,
    }));
    const newPriceHistory = updatedStocks.map((stock) => ({
      id: uuidv4(),
      stockId: stock.id,
      price: stock.currentPrice,
      timestamp: new Date(),
    }));
    setState({
      stocks: updatedStocks,
      priceHistory: [...priceHistory, ...newPriceHistory],
    });
    logAdminAction("stock_grant", getState().currentUser?.id || "unknown", {
      action: "market_inflation",
      percentage,
      multiplier,
    });

    void (async () => {
      try {
        const batchSize = 25;
        const pause = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms));

        for (let i = 0; i < updatedStocks.length; i += batchSize) {
          const stockBatch = updatedStocks.slice(i, i + batchSize);
          const historyBatch = newPriceHistory.slice(i, i + batchSize);

          await Promise.all([
            ...stockBatch.map((stock) =>
              stockService.update(stock.id, {
                currentPrice: stock.currentPrice,
              })
            ),
            ...historyBatch.map((entry) => priceHistoryService.create(entry)),
          ]);

          if (i + batchSize < updatedStocks.length) {
            await pause(200);
          }
        }
      } catch (error) {
        console.error("Failed to persist market inflation updates:", error);
      }
    })();
  };

  const createBuybackOffer = (
    stockId: string,
    offeredPrice: number,
    targetUsers?: string[],
    expiresInHours: number = 24,
    targetShares?: number
  ) => {
    const { buybackOffers, users, stocks, logAdminAction } = getState();
    const timestamp = Date.now();
    const newOffer: BuybackOffer = {
      id: `buyback-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      stockId,
      offeredPrice,
      offeredBy: getState().currentUser?.id || "admin",
      targetUsers,
      createdAt: new Date(timestamp),
      expiresAt: new Date(timestamp + expiresInHours * 60 * 60 * 1000),
      status: "active",
      targetShares,
      acceptedShares: 0,
      acceptedByUsers: [],
    };
    setState({ buybackOffers: [...buybackOffers, newOffer] });

    // Persist offer to database (best effort)
    buybackOfferService
      .create(newOffer)
      .then((saved) => {
        setState((state) => ({
          buybackOffers: state.buybackOffers.map((o) =>
            o.id === newOffer.id ? saved : o
          ),
        }));
      })
      .catch((error) => {
        console.warn("Failed to persist buyback offer:", error);
      });

    const targetUserIds = targetUsers || users.map((u) => u.id);
    targetUserIds.forEach((userId) => {
      getState().sendNotification(
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
    const state = getState();
    const currentUser = state.currentUser;
    if (!currentUser) return;

    const {
      buybackOffers,
      portfolios,
      stocks,
      users,
      transactions,
      unlockAward,
    } = state;
    const offer = buybackOffers.find((o) => o.id === offerId);
    if (!offer || offer.status !== "active" || offer.expiresAt < new Date())
      return;

    const userPortfolio = portfolios.find(
      (p) => p.userId === currentUser.id && p.stockId === offer.stockId
    );
    if (!userPortfolio || userPortfolio.shares < shares) return;

    // If offer has a targetShares cap, ensure we don't exceed remaining
    const alreadyAccepted = offer.acceptedShares ?? 0;
    const remainingCap = offer.targetShares
      ? Math.max(offer.targetShares - alreadyAccepted, 0)
      : undefined;
    const allowedShares =
      remainingCap !== undefined ? Math.min(shares, remainingCap) : shares;
    if (allowedShares <= 0) return;

    const totalAmount = offer.offeredPrice * allowedShares;

    const updatedUsers = users.map((u) =>
      u.id === currentUser.id ? { ...u, balance: u.balance + totalAmount } : u
    );
    const updatedPortfolios = portfolios
      .map((p) =>
        p.userId === currentUser.id && p.stockId === offer.stockId
          ? { ...p, shares: p.shares - allowedShares }
          : p
      )
      .filter((p) => p.shares > 0);
    const updatedStocks = stocks.map((s) =>
      s.id === offer.stockId
        ? { ...s, availableShares: s.availableShares + allowedShares }
        : s
    );
    const newAcceptedShares = (offer.acceptedShares ?? 0) + allowedShares;
    const reachedTarget =
      offer.targetShares !== undefined &&
      newAcceptedShares >= offer.targetShares;
    const updatedOffers = buybackOffers.map((o) => {
      if (o.id !== offerId) return o;
      const existingUsers = new Set(o.acceptedByUsers ?? []);
      existingUsers.add(currentUser.id);
      return {
        ...o,
        acceptedBy: currentUser.id, // keep legacy field for backward compatibility
        acceptedByUsers: Array.from(existingUsers),
        acceptedShares: newAcceptedShares,
        status: reachedTarget ? ("accepted" as const) : ("active" as const),
      };
    });

    const newTransaction: Transaction = {
      id: `tx-${Date.now()}`,
      userId: currentUser.id,
      stockId: offer.stockId,
      type: "sell",
      shares: allowedShares,
      pricePerShare: offer.offeredPrice,
      totalAmount,
      timestamp: new Date(),
    };

    setState({
      users: updatedUsers,
      currentUser: {
        ...currentUser,
        balance: currentUser.balance + totalAmount,
      },
      portfolios: updatedPortfolios,
      stocks: updatedStocks,
      buybackOffers: updatedOffers,
      transactions: [...transactions, newTransaction],
    });

    const { logAdminAction } = getState();
    logAdminAction("stock_removal", currentUser.id, {
      action: "buyback_accepted",
      offerId,
      shares,
      totalAmount,
    });

    // Persist offer status change
    buybackOfferService
      .update(offerId, {
        status: reachedTarget ? "accepted" : "active",
        acceptedBy: currentUser.id,
        acceptedByUsers: updatedOffers.find((o) => o.id === offerId)
          ?.acceptedByUsers,
        acceptedShares: newAcceptedShares,
      })
      .catch((error) => {
        console.warn("Failed to persist buyback acceptance:", error);
      });

    // Count total accepted buyback offers for the user
    const acceptedCount = updatedOffers.filter((o) =>
      (o.acceptedByUsers ?? []).includes(currentUser.id)
    ).length;

    // Unlock buyback awards
    if (unlockAward) {
      if (acceptedCount === 1) {
        unlockAward(currentUser.id, "buyback_starter").catch(() => {});
      }
      if (acceptedCount === 5) {
        unlockAward(currentUser.id, "buyback_broker").catch(() => {});
      }
    }
  };

  const declineBuybackOffer = (offerId: string) => {
    const { logAdminAction } = getState();
    setState((state) => ({
      buybackOffers: state.buybackOffers.map((o) =>
        o.id === offerId ? { ...o, status: "declined" as const } : o
      ),
    }));
    logAdminAction("stock_grant", getState().currentUser?.id || "unknown", {
      action: "buyback_declined",
      offerId,
    });

    // Persist offer decline
    buybackOfferService
      .update(offerId, { status: "declined" })
      .catch((error) => {
        console.warn("Failed to persist buyback decline:", error);
      });
  };

  const cancelBuybackOffer = (offerId: string) => {
    const { logAdminAction } = getState();
    setState((state) => ({
      buybackOffers: state.buybackOffers.map((o) =>
        o.id === offerId ? { ...o, status: "expired" as const } : o
      ),
    }));
    logAdminAction("stock_removal", getState().currentUser?.id || "unknown", {
      action: "buyback_cancelled",
      offerId,
    });

    buybackOfferService
      .update(offerId, { status: "expired" })
      .catch((error) => {
        console.warn("Failed to persist buyback cancel:", error);
      });
  };

  const removeBuybackOffer = async (offerId: string) => {
    const { logAdminAction } = getState();
    setState((state) => ({
      buybackOffers: state.buybackOffers.filter((o) => o.id !== offerId),
    }));
    logAdminAction("stock_removal", getState().currentUser?.id || "unknown", {
      action: "buyback_removed",
      offerId,
    });
    try {
      await buybackOfferService.delete(offerId);
    } catch (error) {
      console.warn("Failed to delete buyback offer:", error);
    }
  };

  const refreshStocks = async () => {
    try {
      const freshStocks = await stockService.getAll();
      if (freshStocks && freshStocks.length > 0) {
        setState({
          stocks: Array.from(
            new Map(freshStocks.map((s) => [s.id, s])).values()
          ),
        });
        console.log(
          "[refreshStocks] Updated from database:",
          freshStocks.length
        );
      }
    } catch (error) {
      console.warn("[refreshStocks] Failed to refresh:", error);
    }
  };

  const refreshPriceHistory = async (stockIds?: string[]) => {
    try {
      const ids =
        stockIds && stockIds.length > 0
          ? stockIds
          : [...getState().stocks]
              .sort(
                (a, b) =>
                  b.currentPrice * b.totalShares -
                  a.currentPrice * a.totalShares
              )
              .slice(0, 10)
              .map((stock) => stock.id);
      await ensurePriceHistoryForStocks(ids, {
        force: true,
        limit: 200,
        minEntries: 0,
      });
      console.log("[refreshPriceHistory] Updated from database:", ids.length);
    } catch (error) {
      console.warn("[refreshPriceHistory] Failed to refresh:", error);
    }
  };

  return {
    buyStock,
    sellStock,
    placeDirectionalBet,
    createStock,
    updateStockPrice,
    deleteStock,
    createShares,
    massCreateShares,
    getUserPortfolio,
    getStockPriceHistory,
    getMarketData,
    ensurePriceHistoryForStocks,
    schedulePriceHistoryLoad,
    applyDailyMarketDrift,
    setMarketDriftEnabled,
    triggerMarketDriftNow,
    inflateMarket,
    createBuybackOffer,
    acceptBuybackOffer,
    declineBuybackOffer,
    cancelBuybackOffer,
    removeBuybackOffer,
    refreshStocks,
    refreshPriceHistory,
  };
}
