import type { StoreApi } from "zustand";
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
} from "../database";
import type { StoreState } from "./types";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

const buildMarketData = (
  priceHistory: PriceHistory[]
): MarketDataPoint[] => {
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

  return marketData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

const applyPriceImpact = (stock: Stock, sharesDelta: number): number => {
  const liquidityFactor = Math.max(0.05, Math.min(0.5, sharesDelta / stock.totalShares));
  const impact = liquidityFactor * 0.5; // scale to avoid extreme swings
  const newPrice = stock.currentPrice * (1 + impact);
  return Math.max(0.01, Number(newPrice.toFixed(2)));
};

export function createMarketActions({
  setState,
  getState,
}: StoreMutators & {
  sendNotification: (
    userId: string,
    type: Notification["type"],
    title: string,
    message: string,
    data?: any
  ) => void;
}) {
  const notifyLiquidityRequest = (stock: Stock, requestedShares: number) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;

    const { portfolios, notifications } = getState();
    const holders = portfolios
      .filter(
        (p) => p.stockId === stock.id && p.shares > 0 && p.userId !== currentUser.id
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

  const buyStock = async (stockId: string, shares: number): Promise<boolean> => {
    const authUser = getState().authUser;
    const currentUser = getState().currentUser;
    if (!authUser || !currentUser) return false;
    if (currentUser.bannedUntil && currentUser.bannedUntil > new Date()) return false;

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
        ? { ...s, availableShares: s.availableShares - shares, currentPrice: newPrice }
        : s
    );
    setState({ stocks: updatedStocks });
    setState((state) => ({
      priceHistory: [
        ...state.priceHistory,
        {
          id: `ph-${Date.now()}`,
          stockId,
          price: newPrice,
          timestamp: new Date(),
        },
      ],
    }));

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
        id: `ph-${Date.now()}`,
        stockId,
        price: newPrice,
        timestamp: new Date(),
      };

      await Promise.all([
        stockService.update(stockId, {
          availableShares: stock.availableShares - shares,
          currentPrice: newPrice,
        }),
        userService.update(currentUser.id, { balance: currentUser.balance - totalCost }),
        existingPortfolio
          ? portfolioService.update(`${currentUser.id}-${stockId}`, {
              shares:
                (existingPortfolio?.shares ?? 0) + shares,
              averageBuyPrice:
                ((existingPortfolio?.averageBuyPrice ?? 0) *
                  (existingPortfolio?.shares ?? 0) +
                  stock.currentPrice * shares) /
                ((existingPortfolio?.shares ?? 0) + shares),
            })
          : portfolioService.create({
              userId: currentUser.id,
              stockId,
              shares,
              averageBuyPrice: stock.currentPrice,
            }),
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
      console.warn("Failed to persist buy transaction:", error);
      return false;
    }

    return true;
  };

  const sellStock = async (stockId: string, shares: number): Promise<boolean> => {
    const currentUser = getState().currentUser;
    if (!currentUser) return false;
    if (currentUser.bannedUntil && currentUser.bannedUntil > new Date()) return false;

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
      currentUser: { ...currentUser, balance: currentUser.balance + totalRevenue },
    });

    const updatedStocks = stocks.map((s) =>
      s.id === stockId
        ? { ...s, availableShares: s.availableShares + shares }
        : s
    );
    setState({ stocks: updatedStocks });

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
      const portfolioPromise =
        newShareCount > 0
          ? portfolioService.update(`${currentUser.id}-${stockId}`, {
              shares: newShareCount,
            })
          : portfolioService.delete(`${currentUser.id}-${stockId}`);

      const priceHistoryEntry = {
        id: `ph-${Date.now()}`,
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
        userService.update(currentUser.id, { balance: currentUser.balance + totalRevenue }),
        portfolioPromise,
        transactionService.create(newTransaction),
        priceHistoryService.create({
          ...priceHistoryEntry,
          price: newPrice,
        }),
      ]);

      setState((state) => ({
        priceHistory: [...state.priceHistory, { ...priceHistoryEntry, price: newPrice }],
        stocks: state.stocks.map((s) =>
          s.id === stockId ? { ...s, currentPrice: newPrice } : s
        ),
      }));
    } catch (error) {
      console.warn("Failed to persist sell transaction:", error);
      return false;
    }

    return true;
  };

  const createStock = (stock: Omit<Stock, "id" | "createdAt">) => {
    const { stocks, priceHistory } = getState();
    const newStock: Stock = {
      ...stock,
      id: `stock-${Date.now()}`,
      createdAt: new Date(),
    };
    setState({ stocks: [...stocks, newStock] });

    const newPriceHistory: PriceHistory = {
      id: `ph-${Date.now()}`,
      stockId: newStock.id,
      price: newStock.currentPrice,
      timestamp: new Date(),
    };
    setState({ priceHistory: [...priceHistory, newPriceHistory] });
  };

  const updateStockPrice = (stockId: string, newPrice: number) => {
    setState((state) => ({
      stocks: state.stocks.map((s) =>
        s.id === stockId ? { ...s, currentPrice: newPrice } : s
      ),
      priceHistory: [
        ...state.priceHistory,
        {
          id: `ph-${Date.now()}`,
          stockId,
          price: newPrice,
          timestamp: new Date(),
        },
      ],
    }));
  };

  const deleteStock = (stockId: string) => {
    const { stocks, priceHistory, portfolios } = getState();
    setState({
      stocks: stocks.filter((s) => s.id !== stockId),
      priceHistory: priceHistory.filter((ph) => ph.stockId !== stockId),
      portfolios: portfolios.filter((p) => p.stockId !== stockId),
    });
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
    const { stocks, priceHistory } = getState();
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
  };

  const createBuybackOffer = (
    stockId: string,
    offeredPrice: number,
    targetUsers?: string[],
    expiresInHours: number = 24
  ) => {
    const { buybackOffers, users, stocks } = getState();
    const timestamp = Date.now();
    const newOffer: BuybackOffer = {
      id: `buyback-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      stockId,
      offeredPrice,
      offeredBy: getState().currentUser?.id || "admin",
      targetUsers,
      expiresAt: new Date(timestamp + expiresInHours * 60 * 60 * 1000),
      status: "active",
    };
    setState({ buybackOffers: [...buybackOffers, newOffer] });

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
    const currentUser = getState().currentUser;
    if (!currentUser) return;

    const { buybackOffers, portfolios, stocks, users, transactions } = getState();
    const offer = buybackOffers.find((o) => o.id === offerId);
    if (!offer || offer.status !== "active" || offer.expiresAt < new Date())
      return;

    const userPortfolio = portfolios.find(
      (p) => p.userId === currentUser.id && p.stockId === offer.stockId
    );
    if (!userPortfolio || userPortfolio.shares < shares) return;

    const totalAmount = offer.offeredPrice * shares;

    const updatedUsers = users.map((u) =>
      u.id === currentUser.id ? { ...u, balance: u.balance + totalAmount } : u
    );
    const updatedPortfolios = portfolios
      .map((p) =>
        p.userId === currentUser.id && p.stockId === offer.stockId
          ? { ...p, shares: p.shares - shares }
          : p
      )
      .filter((p) => p.shares > 0);
    const updatedStocks = stocks.map((s) =>
      s.id === offer.stockId
        ? { ...s, availableShares: s.availableShares + shares }
        : s
    );
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

    setState({
      users: updatedUsers,
      currentUser: { ...currentUser, balance: currentUser.balance + totalAmount },
      portfolios: updatedPortfolios,
      stocks: updatedStocks,
      buybackOffers: updatedOffers,
      transactions: [...transactions, newTransaction],
    });
  };

  const declineBuybackOffer = (offerId: string) => {
    setState((state) => ({
      buybackOffers: state.buybackOffers.map((o) =>
        o.id === offerId ? { ...o, status: "declined" as const } : o
      ),
    }));
  };

  return {
    buyStock,
    sellStock,
    createStock,
    updateStockPrice,
    deleteStock,
    getUserPortfolio,
    getStockPriceHistory,
    getMarketData,
    inflateMarket,
    createBuybackOffer,
    acceptBuybackOffer,
    declineBuybackOffer,
  };
}
