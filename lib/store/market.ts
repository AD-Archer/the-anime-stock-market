import type { StoreApi } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  BuybackOffer,
  MarketDataPoint,
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
} from "../database";
import { toast } from "@/hooks/use-toast";
import type { StoreState } from "./types";
import { generateShortId } from "../utils";

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
  const liquidityFactor = Math.max(
    0.05,
    Math.min(0.5, sharesDelta / stock.totalShares)
  );
  const impact = liquidityFactor * 0.5; // scale to avoid extreme swings
  const newPrice = stock.currentPrice * (1 + impact);
  return Math.max(0.01, Number(newPrice.toFixed(2)));
};

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

    const totalCost = stock.currentPrice * shares;
    if (currentUser.balance < totalCost) return false;

    const updatedUsers = users.map((u) =>
      u.id === currentUser.id ? { ...u, balance: u.balance - totalCost } : u
    );
    setState({
      users: updatedUsers,
      currentUser: { ...currentUser, balance: currentUser.balance - totalCost },
    });

    const newPrice = applyPriceImpact(stock, shares);
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
    setState((state) => ({
      priceHistory: [
        ...state.priceHistory,
        {
          id: uuidv4(),
          stockId,
          price: newPrice,
          timestamp: new Date(),
        },
      ],
    }));

    const newTransaction: Transaction = {
      id: generateShortId(),
      userId: currentUser.id,
      stockId,
      type: "buy",
      shares,
      pricePerShare: stock.currentPrice,
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
          stock.currentPrice * shares) /
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
            averageBuyPrice: stock.currentPrice,
          },
        ],
      });
    }

    try {
      const priceHistoryEntry = {
        id: uuidv4(),
        stockId,
        price: newPrice,
        timestamp: new Date(),
      };

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
                stock.currentPrice * shares) /
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
          averageBuyPrice: stock.currentPrice,
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
        priceHistoryService.create(priceHistoryEntry),
      ]);
      setState((state) => ({
        priceHistory: [...state.priceHistory, priceHistoryEntry],
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

    const { portfolios, stocks, users, transactions } = getState();
    const portfolio = portfolios.find(
      (p) => p.userId === currentUser.id && p.stockId === stockId
    );
    if (!portfolio || portfolio.shares < shares) return false;

    const stock = stocks.find((s) => s.id === stockId);
    if (!stock) return false;

    const totalRevenue = stock.currentPrice * shares;

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
        ? { ...s, availableShares: s.availableShares + shares }
        : s
    );
    setState({ stocks: updatedStocks });

    const newTransaction: Transaction = {
      id: generateShortId(),
      userId: currentUser.id,
      stockId,
      type: "sell",
      shares,
      pricePerShare: stock.currentPrice,
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

    // Snapshot for rollback in case persistence fails
    const prevState = {
      users: getState().users,
      currentUser: getState().currentUser,
      stocks: getState().stocks,
      portfolios: getState().portfolios,
      transactions: getState().transactions,
      priceHistory: getState().priceHistory,
    };

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

      const priceHistoryEntry = {
        id: uuidv4(),
        stockId,
        price: 0,
        timestamp: new Date(),
      };

      const newPrice = applyPriceImpact(stock, -shares);
      priceHistoryEntry.price = newPrice;

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
        priceHistoryService.create({
          ...priceHistoryEntry,
          price: newPrice,
        }),
      ]);

      setState((state) => ({
        priceHistory: [
          ...state.priceHistory,
          { ...priceHistoryEntry, price: newPrice },
        ],
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

  const createStock = async (stock: Omit<Stock, "id" | "createdAt">) => {
    const { stocks, priceHistory, logAdminAction, users, sendNotification } =
      getState();
    const newStock: Stock = {
      ...stock,
      id: generateShortId(),
      createdAt: new Date(),
    };

    // Check if stock already exists
    if (stocks.some((s) => s.id === newStock.id)) {
      console.warn("Stock already exists:", newStock.id);
      return;
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

    logAdminAction("stock_grant", newStock.createdBy, {
      stockId: newStock.id,
      characterName: newStock.characterName,
      anime: newStock.anime,
      initialPrice: newStock.currentPrice,
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
  };

  const updateStockPrice = (stockId: string, newPrice: number) => {
    const { logAdminAction } = getState();
    setState((state) => ({
      stocks: state.stocks.map((s) =>
        s.id === stockId ? { ...s, currentPrice: newPrice } : s
      ),
      priceHistory: [
        ...state.priceHistory,
        {
          id: uuidv4(),
          stockId,
          price: newPrice,
          timestamp: new Date(),
        },
      ],
    }));
    const stock = getState().stocks.find((s) => s.id === stockId);
    logAdminAction("stock_grant", stock?.createdBy || "unknown", {
      stockId,
      newPrice,
      action: "price_update",
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

    setState((state) => ({
      stocks: state.stocks.map((s) =>
        s.id === stockId
          ? {
              ...s,
              totalShares: totalNewShares,
              availableShares: s.availableShares + newShareCount,
              currentPrice: Number(newPrice.toFixed(2)),
            }
          : s
      ),
      priceHistory: [
        ...state.priceHistory,
        {
          id: uuidv4(),
          stockId,
          price: Number(newPrice.toFixed(2)),
          timestamp: new Date(),
        },
      ],
    }));

    logAdminAction("stock_grant", stock.createdBy, {
      action: "shares_created",
      stockId,
      newShareCount,
      totalNewShares,
      oldPrice: stock.currentPrice,
      newPrice: Number(newPrice.toFixed(2)),
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

  const getUserPortfolio = (userId: string): Portfolio[] => {
    return getState().portfolios.filter((p) => p.userId === userId);
  };

  const getStockPriceHistory = (stockId: string): PriceHistory[] => {
    return getState()
      .priceHistory.filter((ph) => ph.stockId === stockId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  const getMarketData = (): MarketDataPoint[] =>
    buildMarketData(getState().priceHistory);

  const inflateMarket = (percentage: number) => {
    const { stocks, priceHistory, logAdminAction } = getState();
    const multiplier = 1 + percentage / 100;
    const updatedStocks = stocks.map((stock) => ({
      ...stock,
      currentPrice: stock.currentPrice * multiplier,
    }));
    const newPriceHistory = stocks.map((stock) => ({
      id: `ph-${Date.now()}-${stock.id}`,
      stockId: stock.id,
      price: stock.currentPrice * multiplier,
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

  return {
    buyStock,
    sellStock,
    createStock,
    updateStockPrice,
    deleteStock,
    createShares,
    getUserPortfolio,
    getStockPriceHistory,
    getMarketData,
    inflateMarket,
    createBuybackOffer,
    acceptBuybackOffer,
    declineBuybackOffer,
    cancelBuybackOffer,
    removeBuybackOffer,
    refreshStocks,
  };
}
