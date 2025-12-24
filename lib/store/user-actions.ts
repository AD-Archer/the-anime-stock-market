import type { StoreApi } from "zustand";
import type { AdminActionType, Portfolio, Transaction, User } from "../types";
import {
  portfolioService,
  transactionService,
  userService,
} from "../database";
import type { StoreState } from "./types";
import { sendSystemEvent } from "../system-events-client";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

export function createUserActions({ setState, getState }: StoreMutators) {
  const persistUserUpdate = async (
    userId: string,
    updates: Partial<User>
  ): Promise<User | null> => {
    const existing = getState().users.find((u) => u.id === userId);
    if (!existing) return null;

    const merged: User = { ...existing, ...updates };

    setState((state) => ({
      users: state.users.map((u) => (u.id === userId ? merged : u)),
      currentUser: state.currentUser?.id === userId ? merged : state.currentUser,
    }));

    try {
      const baseKeys: (keyof User)[] = [
        "username",
        "email",
        "balance",
        "isAdmin",
        "showNsfw",
        "showSpoilers",
        "isPortfolioPublic",
      ];
      const optionalKeys: (keyof User)[] = [];
      if (updates.bannedUntil !== undefined) {
        optionalKeys.push("bannedUntil");
      }
      if (updates.pendingDeletionAt !== undefined) {
        optionalKeys.push("pendingDeletionAt");
      }
      const preferenceKeys: (keyof User)[] = [];
      if (updates.hideTransactions !== undefined) {
        preferenceKeys.push("hideTransactions");
      }
      if (updates.anonymousTransactions !== undefined) {
        preferenceKeys.push("anonymousTransactions");
      }

      const buildPayload = (keys: (keyof User)[]) =>
        Object.fromEntries(keys.map((key) => [key, (merged as any)[key]]));

      const payload = buildPayload([...baseKeys, ...optionalKeys, ...preferenceKeys]);

      const preferenceValues =
        preferenceKeys.length > 0
          ? Object.fromEntries(preferenceKeys.map((key) => [key, (merged as any)[key]]))
          : {};

      try {
        const saved = await userService.update(userId, payload as Partial<User>);
        setState((state) => ({
          users: state.users.map((u) => (u.id === userId ? saved : u)),
          currentUser: state.currentUser?.id === userId ? saved : state.currentUser,
        }));
        return saved;
      } catch (innerError: any) {
        const message = innerError?.message ?? "";
        const hasPrefs = preferenceKeys.length > 0;
        if (hasPrefs && message.includes("Unknown attribute")) {
          const fallbackPayload = buildPayload([...baseKeys, ...optionalKeys]);
          try {
            const saved = await userService.update(userId, fallbackPayload as Partial<User>);
            setState((state) => ({
              users: state.users.map((u) => (u.id === userId ? saved : u)),
              currentUser: state.currentUser?.id === userId ? saved : state.currentUser,
            }));
            // Keep local preference flags even if backend ignores them
            setState((state) => ({
              users: state.users.map((u) =>
                u.id === userId ? { ...u, ...preferenceValues } : u
              ),
              currentUser:
                state.currentUser?.id === userId
                  ? { ...state.currentUser, ...preferenceValues }
                  : state.currentUser,
            }));
            return { ...saved, ...preferenceValues } as User;
          } catch (retryError) {
            console.error("Failed to update user after stripping preferences:", retryError);
          }
        }
        throw innerError;
      }
    } catch (error) {
      console.error("Failed to update user:", error);
      setState((state) => ({
        users: state.users.map((u) => (u.id === userId ? existing : u)),
        currentUser: state.currentUser?.id === userId ? existing : state.currentUser,
      }));
      return null;
    }
  };

  const logAdmin = async (
    action: AdminActionType,
    targetUserId: string,
    metadata?: Record<string, unknown>
  ) => {
    const logger = getState().logAdminAction;
    if (logger) {
      try {
        await logger(action, targetUserId, metadata);
      } catch (error) {
        console.warn("Failed to persist admin action log", error);
      }
    }
  };

  const updateContentPreferences = async (preferences: {
    showNsfw?: boolean;
    showSpoilers?: boolean;
    isPortfolioPublic?: boolean;
    hideTransactions?: boolean;
    anonymousTransactions?: boolean;
  }) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;

    await persistUserUpdate(currentUser.id, preferences);
  };

  const banUser = async (
    userId: string,
    duration: "week" | "month" | "year" | "forever" | Date
  ) => {
    let bannedUntil: Date | null = null;

    if (duration === "forever") {
      bannedUntil = new Date("2099-12-31");
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

    await persistUserUpdate(userId, { bannedUntil });

    if (bannedUntil) {
      const bannedUntilIso = bannedUntil.toISOString();
      await logAdmin("ban", userId, { bannedUntil: bannedUntilIso });
      await sendSystemEvent({
        type: "user_banned",
        userId,
        metadata: { bannedUntil: bannedUntilIso },
      });
    }
  };

  const unbanUser = async (userId: string) => {
    await persistUserUpdate(userId, { bannedUntil: null, pendingDeletionAt: null });
    await logAdmin("unban", userId);
  };

  const hardDeleteUser = async (userId: string) => {
    const { portfolios, transactions } = getState();
    const userPortfolios = portfolios.filter((p) => p.userId === userId);
    const userTransactions = transactions.filter((t) => t.userId === userId);

    setState((state) => ({
      users: state.users.filter((u) => u.id !== userId),
      portfolios: state.portfolios.filter((p) => p.userId !== userId),
      transactions: state.transactions.filter((t) => t.userId !== userId),
    }));

    try {
      for (const p of userPortfolios) {
        await portfolioService.delete(`${p.userId}-${p.stockId}`);
      }
      for (const t of userTransactions) {
        await transactionService.delete(t.id);
      }
      await userService.delete(userId);
    } catch (error) {
      console.error("Failed to delete user from backend:", error);
    }
  };

  const finalizeUserDeletion = async (userId: string) => {
    const deletedAt = new Date().toISOString();
    await sendSystemEvent({
      type: "account_deleted",
      userId,
      metadata: { deletedAt },
    });
    await hardDeleteUser(userId);
    await logAdmin("deletion_finalized", userId, { deletedAt });
  };

  const deleteUser = async (userId: string) => {
    const deletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await persistUserUpdate(userId, {
      bannedUntil: deletionDate,
      pendingDeletionAt: deletionDate,
    });
    const deletionDateIso = deletionDate.toISOString();
    await logAdmin("deletion_scheduled", userId, { deletionDate: deletionDateIso });
    await sendSystemEvent({
      type: "deletion_scheduled",
      userId,
      metadata: { deletionDate: deletionDateIso },
    });
  };

  const processPendingDeletions = async () => {
    const now = Date.now();
    const dueUsers = getState().users.filter(
      (user) =>
        user.pendingDeletionAt !== null &&
        user.pendingDeletionAt.getTime() <= now
    );

    for (const user of dueUsers) {
      await finalizeUserDeletion(user.id);
    }
  };

  const makeUserAdmin = async (userId: string) => {
    await persistUserUpdate(userId, { isAdmin: true });
  };

  const removeUserAdmin = async (userId: string) => {
    await persistUserUpdate(userId, { isAdmin: false });
  };

  const giveUserMoney = async (userId: string, amount: number) => {
    const user = getState().users.find((u) => u.id === userId);
    if (!user) return;

    const newBalance = user.balance + amount;
    await persistUserUpdate(userId, { balance: newBalance });
    await logAdmin("money_grant", userId, { amount });
  };

  const takeUserMoney = async (userId: string, amount: number) => {
    const user = getState().users.find((u) => u.id === userId);
    if (!user) return;

    const newBalance = Math.max(0, user.balance - amount);
    await persistUserUpdate(userId, { balance: newBalance });
    await logAdmin("money_withdrawal", userId, { amount });
  };

  const giveUserStocks = async (
    userId: string,
    stockId: string,
    shares: number
  ) => {
    try {
      const { stocks, portfolios, transactions } = getState();
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

        const updatedPortfolio = {
          ...existingPortfolio,
          shares: totalShares,
          averageBuyPrice: newAverageBuyPrice,
        };

        const updatedPortfolios = portfolios.map((p) =>
          p.userId === userId && p.stockId === stockId ? updatedPortfolio : p
        );
        setState({ portfolios: updatedPortfolios });

        await portfolioService.update(`${userId}-${stockId}`, updatedPortfolio);
      } else {
        const newPortfolio: Portfolio = {
          userId,
          stockId,
          shares,
          averageBuyPrice: stock.currentPrice,
        };

        setState({ portfolios: [...portfolios, newPortfolio] });
        await portfolioService.create(newPortfolio);
      }

      const newTransaction: Transaction = {
        id: `tx-${Date.now()}`,
        userId,
        stockId,
        type: "buy",
        shares,
        pricePerShare: stock.currentPrice,
        totalAmount: stock.currentPrice * shares,
        timestamp: new Date(),
      };
      setState({ transactions: [...transactions, newTransaction] });

      await transactionService.create(newTransaction);
      await logAdmin("stock_grant", userId, {
        stockId,
        shares,
      });
    } catch (error) {
      console.error("Failed to give user stocks:", error);
    }
  };

  const removeUserStocks = async (
    userId: string,
    stockId: string,
    shares: number
  ) => {
    try {
      const { portfolios, stocks } = getState();
      const portfolio = portfolios.find(
        (p) => p.userId === userId && p.stockId === stockId
      );
      if (!portfolio || portfolio.shares < shares) return;

      const newShares = portfolio.shares - shares;
      const updatedPortfolios = portfolios
        .map((p) =>
          p.userId === userId && p.stockId === stockId
            ? { ...p, shares: newShares }
            : p
        )
        .filter((p) => p.shares > 0);
      setState({ portfolios: updatedPortfolios });

      const updatedStocks = stocks.map((s) =>
        s.id === stockId
          ? { ...s, availableShares: s.availableShares + shares }
          : s
      );
      setState({ stocks: updatedStocks });

      if (newShares > 0) {
        await portfolioService.update(`${userId}-${stockId}`, { shares: newShares });
      } else {
        await portfolioService.delete(`${userId}-${stockId}`);
      }
      await logAdmin("stock_removal", userId, {
        stockId,
        shares,
      });
    } catch (error) {
      console.error("Failed to remove user stocks:", error);
    }
  };

  return {
    updateContentPreferences,
    banUser,
    unbanUser,
    deleteUser,
    processPendingDeletions,
    makeUserAdmin,
    removeUserAdmin,
    giveUserMoney,
    takeUserMoney,
    giveUserStocks,
    removeUserStocks,
  };
}
