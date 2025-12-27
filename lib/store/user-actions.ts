import type { StoreApi } from "zustand";
import type {
  AdminActionType,
  MediaType,
  Portfolio,
  PremiumComboMode,
  PremiumMeta,
  PremiumAddition,
  Transaction,
  User,
} from "../types";
import {
  portfolioService,
  premiumAdditionService,
  transactionService,
  userService,
} from "../database";
import type { StoreState } from "./types";
import { sendSystemEvent } from "../system-events-client";
import { generateShortId } from "../utils";
import {
  DEFAULT_PREMIUM_META,
  getTierForMeta,
  incrementPremiumMetaBy,
} from "../premium";

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
      currentUser:
        state.currentUser?.id === userId ? merged : state.currentUser,
    }));

    try {
      const baseKeys: (keyof User)[] = [
        "username",
        "displayName",
        "displaySlug",
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
      if (updates.avatarUrl !== undefined) {
        optionalKeys.push("avatarUrl");
      }
      if (updates.pendingDeletionAt !== undefined) {
        optionalKeys.push("pendingDeletionAt");
      }
      if (updates.premiumMeta !== undefined) {
        optionalKeys.push("premiumMeta");
      }
      const preferenceKeys: (keyof User)[] = [];
      if (updates.hideTransactions !== undefined) {
        preferenceKeys.push("hideTransactions");
      }
      if (updates.anonymousTransactions !== undefined) {
        preferenceKeys.push("anonymousTransactions");
      }
      // Persist theme preference if present
      if (updates.theme !== undefined) {
        preferenceKeys.push("theme");
      }
      if (updates.emailNotificationsEnabled !== undefined) {
        preferenceKeys.push("emailNotificationsEnabled");
      }
      if (updates.directMessageEmailNotifications !== undefined) {
        preferenceKeys.push("directMessageEmailNotifications");
      }

      const buildPayload = (keys: (keyof User)[]) =>
        Object.fromEntries(keys.map((key) => [key, (merged as any)[key]]));

      const payload = buildPayload([
        ...baseKeys,
        ...optionalKeys,
        ...preferenceKeys,
      ]);

      const preferenceValues =
        preferenceKeys.length > 0
          ? Object.fromEntries(
              preferenceKeys.map((key) => [key, (merged as any)[key]])
            )
          : {};
      const avatarValues =
        updates.avatarUrl !== undefined ? { avatarUrl: merged.avatarUrl } : {};

      try {
        const saved = await userService.update(
          userId,
          payload as Partial<User>
        );
        console.debug("persistUserUpdate: saved user", {
          userId,
          theme: (saved as any).theme,
        });
        setState((state) => ({
          users: state.users.map((u) => (u.id === userId ? saved : u)),
          currentUser:
            state.currentUser?.id === userId ? saved : state.currentUser,
        }));
        return saved;
      } catch (innerError: any) {
        const message = innerError?.message ?? "";
        const hasPrefs = preferenceKeys.length > 0;
        const hasAvatar = updates.avatarUrl !== undefined;
        if ((hasPrefs || hasAvatar) && message.includes("Unknown attribute")) {
          const fallbackPayload = buildPayload([
            ...baseKeys,
            ...optionalKeys.filter((key) => key !== "avatarUrl"),
          ]);
          try {
            const saved = await userService.update(
              userId,
              fallbackPayload as Partial<User>
            );
            setState((state) => ({
              users: state.users.map((u) => (u.id === userId ? saved : u)),
              currentUser:
                state.currentUser?.id === userId ? saved : state.currentUser,
            }));
            // Keep local preference flags even if backend ignores them
            setState((state) => ({
              users: state.users.map((u) =>
                u.id === userId
                  ? { ...u, ...preferenceValues, ...avatarValues }
                  : u
              ),
              currentUser:
                state.currentUser?.id === userId
                  ? {
                      ...state.currentUser,
                      ...preferenceValues,
                      ...avatarValues,
                    }
                  : state.currentUser,
            }));
            return { ...saved, ...preferenceValues, ...avatarValues } as User;
          } catch (retryError) {
            console.error(
              "Failed to update user after stripping preferences:",
              retryError
            );
          }
        }
        throw innerError;
      }
    } catch (error) {
      console.error("Failed to update user:", error);
      setState((state) => ({
        users: state.users.map((u) => (u.id === userId ? existing : u)),
        currentUser:
          state.currentUser?.id === userId ? existing : state.currentUser,
      }));
      return null;
    }
  };

  const getUserPremiumMeta = (userId: string): PremiumMeta => {
    const user = getState().users.find((u) => u.id === userId);
    return user?.premiumMeta ?? DEFAULT_PREMIUM_META;
  };

  const updatePremiumMeta = async (
    userId: string,
    updater: (meta: PremiumMeta) => PremiumMeta
  ) => {
    const nextMeta = updater(getUserPremiumMeta(userId));
    await persistUserUpdate(userId, { premiumMeta: nextMeta });
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

  const updateNotificationPreferences = async (preferences: {
    emailNotificationsEnabled?: boolean;
    directMessageEmailNotifications?: boolean;
  }) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;

    await persistUserUpdate(currentUser.id, preferences);
  };

  const setUserAvatar = async (avatarUrl: string | null) => {
    const currentUser = getState().currentUser;
    if (!currentUser) return;

    await persistUserUpdate(currentUser.id, { avatarUrl });
  };

  const updateTheme = async (theme: "light" | "dark" | "system") => {
    const currentUser = getState().currentUser;
    if (!currentUser) return false;

    try {
      const saved = await persistUserUpdate(currentUser.id, { theme });
      return !!saved;
    } catch (error) {
      console.error("Failed to persist theme:", error);
      return false;
    }
  };

  const setPremiumStatus = async (userId: string, enabled: boolean) => {
    await updatePremiumMeta(userId, (meta) => {
      if (!enabled) {
        return { ...DEFAULT_PREMIUM_META };
      }
      return {
        ...meta,
        isPremium: true,
        premiumSince: meta.premiumSince ?? new Date(),
      };
    });
  };

  const setPremiumComboMode = async (
    userId: string,
    comboMode: PremiumComboMode
  ) => {
    await updatePremiumMeta(userId, (meta) => ({
      ...meta,
      comboMode,
    }));
  };

  const setPremiumAutoAdd = async (userId: string, enabled: boolean) => {
    await updatePremiumMeta(userId, (meta) => ({
      ...meta,
      autoAdd: enabled,
    }));
  };

  const updatePremiumMetaFields = async (
    userId: string,
    patch: Partial<PremiumMeta>
  ) => {
    const currentMeta = getUserPremiumMeta(userId);
    const nextMeta = { ...currentMeta, ...patch };
    await persistUserUpdate(userId, { premiumMeta: nextMeta });
  };

  const incrementPremiumCharacterCount = async (
    userId: string,
    mediaType: MediaType,
    addedCount = 1,
    duplicateCount = 0
  ) => {
    await updatePremiumMeta(userId, (meta) =>
      incrementPremiumMetaBy(meta, mediaType, addedCount, duplicateCount)
    );
  };

  const addPremiumAdditions = async (
    userId: string,
    additions: Omit<PremiumAddition, "id" | "createdAt" | "userId">[]
  ) => {
    if (additions.length === 0) return [];
    const created = await premiumAdditionService.createMany(
      additions.map((addition) => ({
        ...addition,
        userId,
        createdAt: new Date(),
      }))
    );
    if (created.length > 0) {
      setState((state) => ({
        premiumAdditions: [
          ...created,
          ...state.premiumAdditions.filter((entry) => entry.userId === userId),
        ]
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 50),
      }));
    }
    return created;
  };

  const refreshPremiumAdditions = async (userId?: string) => {
    const resolvedUserId = userId ?? getState().currentUser?.id;
    if (!resolvedUserId) return;
    const additions = await premiumAdditionService.listByUser(
      resolvedUserId,
      25
    );
    setState({ premiumAdditions: additions });
  };

  const claimPremiumReward = async () => {
    const currentUser = getState().currentUser;
    if (!currentUser) {
      return {
        success: false,
        message: "You must be logged in to claim premium rewards.",
      };
    }

    const meta = currentUser.premiumMeta ?? DEFAULT_PREMIUM_META;
    if (!meta.isPremium) {
      return {
        success: false,
        message: "Premium access is required to claim tier rewards.",
      };
    }
    const tier = getTierForMeta(meta);
    if (!tier) {
      return {
        success: false,
        message: "No premium tier reward is available yet.",
      };
    }

    const lastClaim = meta.lastPremiumRewardClaim ?? null;
    const now = new Date();
    if (lastClaim) {
      const hoursSince =
        (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursUntil = Math.ceil(24 - hoursSince);
        return {
          success: false,
          message: `You can claim your next premium reward in ${hoursUntil} hours.`,
        };
      }
    }

    try {
      const rewardAmount = tier.reward;
      const nextMeta = { ...meta, lastPremiumRewardClaim: now };
      const updatedUser = await persistUserUpdate(currentUser.id, {
        balance: currentUser.balance + rewardAmount,
        premiumMeta: nextMeta,
      });
      if (!updatedUser) {
        return {
          success: false,
          message: "Unable to claim your premium reward right now.",
        };
      }
      return {
        success: true,
        amount: rewardAmount,
        message: `Claimed $${rewardAmount.toFixed(2)} premium tier reward.`,
      };
    } catch (error) {
      console.error("Failed to claim premium reward:", error);
      return {
        success: false,
        message: "Failed to claim your premium reward. Please try again.",
      };
    }
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
    await persistUserUpdate(userId, {
      bannedUntil: null,
      pendingDeletionAt: null,
    });
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
        await portfolioService.delete(p.id);
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
    await logAdmin("deletion_scheduled", userId, {
      deletionDate: deletionDateIso,
    });
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

        // Query DB to get actual document ID
        const dbPortfolio = await portfolioService.getByUserAndStock(
          userId,
          stockId
        );
        if (dbPortfolio) {
          await portfolioService.update(dbPortfolio.id, updatedPortfolio);
        }
      } else {
        const newPortfolio: Portfolio = {
          id: generateShortId(),
          userId,
          stockId,
          shares,
          averageBuyPrice: stock.currentPrice,
        };

        setState({ portfolios: [...portfolios, newPortfolio] });
        await portfolioService.create(newPortfolio);
      }

      const newTransaction: Transaction = {
        id: generateShortId(),
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
        // Query DB to get actual document ID
        const dbPortfolio = await portfolioService.getByUserAndStock(
          userId,
          stockId
        );
        if (dbPortfolio) {
          await portfolioService.update(dbPortfolio.id, {
            id: dbPortfolio.id,
            userId: dbPortfolio.userId,
            stockId: dbPortfolio.stockId,
            shares: newShares,
            averageBuyPrice: dbPortfolio.averageBuyPrice,
          });
        }
      } else {
        // Query DB to get actual document ID
        const dbPortfolio = await portfolioService.getByUserAndStock(
          userId,
          stockId
        );
        if (dbPortfolio) {
          await portfolioService.delete(dbPortfolio.id);
        }
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
    updateNotificationPreferences,
    setUserAvatar,
    updateTheme,
    setPremiumStatus,
    setPremiumComboMode,
    setPremiumAutoAdd,
    updatePremiumMeta: updatePremiumMetaFields,
    incrementPremiumCharacterCount,
    addPremiumAdditions,
    refreshPremiumAdditions,
    claimPremiumReward,
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
