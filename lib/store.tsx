"use client";

import { useEffect, type ReactNode } from "react";
import { create } from "zustand";
import { useAuth } from "./auth";
import {
  initialBuybackOffers,
  initialComments,
  initialNotifications,
  initialPortfolios,
  initialPriceHistory,
  initialReports,
  initialStocks,
  initialTransactions,
  initialUsers,
  initialAppeals,
  initialAdminActionLogs,
  initialAwards,
  initialFriends,
  initialDailyRewards,
} from "./data";
import { databases } from "./appwrite/appwrite";
import {
  buybackOfferService,
  commentService,
  notificationService,
  reportService,
  stockService,
  transactionService,
  userService,
  portfolioService,
  priceHistoryService,
  appealService,
  adminActionLogService,
  DATABASE_ID,
  COMMENTS_COLLECTION,
  FRIENDS_COLLECTION,
  NOTIFICATIONS_COLLECTION,
  STOCKS_COLLECTION,
  PRICE_HISTORY_COLLECTION,
  mapComment,
  mapFriend,
  mapNotification,
  mapPriceHistory,
  mapStock,
} from "./database";
import { awardService } from "./database/awardService";
import { dailyRewardService } from "./database/dailyRewardService";
import { createNotificationActions } from "./store/notifications";
import { createCommentActions } from "./store/comments";
import { createUserActions } from "./store/user-actions";
import { createMarketActions } from "./store/market";
import { createReportActions } from "./store/reports";
import { createMessageActions } from "./store/messages";
import { createAppealActions } from "./store/appeals";
import { createAdminLogActions } from "./store/admin-log";
import { createAwardActions } from "./store/awards";
import { createFriendActions } from "./store/friends";
import { createDailyRewardActions } from "./store/daily-rewards";
import type { StoreState } from "./store/types";
import type { User } from "./types";
import { makeUniqueUsername } from "./usernames";

export const useStore = create<StoreState>((set, get) => {
  const notificationActions = createNotificationActions({
    setState: set,
    getState: get,
  });
  const commentActions = createCommentActions({ setState: set, getState: get });
  const userActions = createUserActions({ setState: set, getState: get });
  const awardActions = createAwardActions({ setState: set, getState: get });
  const marketActions = createMarketActions({
    setState: set,
    getState: get,
    sendNotification: notificationActions.sendNotification,
    unlockAward: awardActions.unlockAward,
  });
  const reportActions = createReportActions({
    setState: set,
    getState: get,
    buildThreadContext: commentActions.buildThreadContext,
    describeCommentLocation: commentActions.describeCommentLocation,
    deleteComment: commentActions.deleteComment,
  });
  const messageActions = createMessageActions({ setState: set, getState: get });
  const appealActions = createAppealActions({ setState: set, getState: get });
  const adminLogActions = createAdminLogActions({
    setState: set,
    getState: get,
  });
  const friendActions = createFriendActions({ setState: set, getState: get });
  const dailyRewardActions = createDailyRewardActions({
    setState: set,
    getState: get,
  });

  return {
    currentUser: null,
    setCurrentUser: (user: User | null) => set({ currentUser: user }),
    isLoading: true,
    authUser: null,
    users: [],
    stocks: [],
    transactions: [],
    priceHistory: [],
    portfolios: [],
    comments: [],
    buybackOffers: [],
    notifications: [],
    reports: [],
    appeals: [],
    adminActionLogs: [],
    awards: [],
    friends: [],
    dailyRewards: [],
    messages: [],
    conversations: [],
    ...notificationActions,
    ...commentActions,
    ...userActions,
    ...marketActions,
    ...reportActions,
    ...messageActions,
    ...appealActions,
    ...adminLogActions,
    ...awardActions,
    ...friendActions,
    ...dailyRewardActions,
  };
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const isLoading = useStore((state) => state.isLoading);

  useEffect(() => {
    if (authLoading) return;

    const loadData = async () => {
      useStore.setState({
        isLoading: true,
        authUser: user ? { id: user.id } : null,
      });
      try {
        const [
          usersData,
          stocksData,
          transactionsData,
          buybackOffersData,
          commentsData,
          reportsData,
          notificationsData,
          portfoliosData,
          priceHistoryData,
          appealsData,
          adminLogData,
          awardsData,
          friendsData,
          dailyRewardsData,
        ] = await Promise.all([
          userService.getAll(),
          stockService.getAll(),
          transactionService.getAll(),
          buybackOfferService.getAll(),
          commentService.getAll(),
          reportService.getAll(),
          notificationService.getAll(),
          portfolioService.getAll(),
          priceHistoryService.getAll(),
          appealService.getAll(),
          adminActionLogService.getAll(),
          awardService.getAll(),
          (await import("./database")).friendService.getAll(),
          dailyRewardService.getAll().catch(() => []),
        ]);

        useStore.setState({
          users: usersData.length > 0 ? usersData : initialUsers,
          stocks: stocksData.length > 0 ? stocksData : initialStocks,
          transactions:
            transactionsData.length > 0
              ? transactionsData
              : initialTransactions,
          buybackOffers:
            buybackOffersData.length > 0
              ? buybackOffersData
              : initialBuybackOffers,
          comments: commentsData.length > 0 ? commentsData : initialComments,
          reports: (reportsData.length > 0 ? reportsData : initialReports).sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          ),
          notifications: (notificationsData.length > 0
            ? notificationsData
            : initialNotifications
          ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
          priceHistory:
            priceHistoryData.length > 0
              ? priceHistoryData
              : stocksData.length > 0
              ? stocksData.map((s) => ({
                  id: `ph-init-${s.id}`,
                  stockId: s.id,
                  price: s.currentPrice,
                  timestamp: s.createdAt,
                }))
              : [],
          portfolios:
            portfoliosData.length > 0 ? portfoliosData : initialPortfolios,
          appeals: appealsData.length > 0 ? appealsData : initialAppeals,
          adminActionLogs:
            adminLogData.length > 0 ? adminLogData : initialAdminActionLogs,
          awards: awardsData.length > 0 ? awardsData : initialAwards,
          friends: friendsData.length > 0 ? friendsData : initialFriends,
          dailyRewards:
            dailyRewardsData.length > 0
              ? dailyRewardsData
              : initialDailyRewards,
        });

        await useStore.getState().processPendingDeletions();

        if (user) {
          let matchedUser: User | null =
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
                username: makeUniqueUsername(
                  user.name ||
                    user.email.split("@")[0] ||
                    `user-${Date.now().toString(36)}`,
                  usersData.map((u) => u.username)
                ),
                email: user.email,
                balance: 100,
                isAdmin: false,
                createdAt: new Date(),
                avatarUrl: null,
                bannedUntil: null,
                showNsfw: true,
                showSpoilers: true,
                isPortfolioPublic: false,
                hideTransactions: false,
                anonymousTransactions: false,
                pendingDeletionAt: null,
              });
              matchedUser = created;
              useStore.setState((state) => ({
                users: [...state.users, created],
              }));

              // Give new accounts a claimable welcome bonus achievement.
              await useStore.getState().unlockAward(user.id, "welcome_bonus");
            } catch (e) {
              console.warn(
                "Failed to create user record for Appwrite account",
                e
              );
            }
          }

          if (matchedUser) {
            useStore.setState({ currentUser: matchedUser });

            // Ensure all users have the welcome bonus available (one-time claimable).
            const hasWelcomeBonus = awardsData.some(
              (a) => a.userId === matchedUser.id && a.type === "welcome_bonus"
            );
            if (!hasWelcomeBonus) {
              await useStore
                .getState()
                .unlockAward(matchedUser.id, "welcome_bonus");
            }

            // Ensure early adopter is unlocked for accounts created before 2026-03-01
            const earlyAdopterDate = new Date("2026-03-01");
            const hasEarlyAdopter = awardsData.some(
              (a) => a.userId === matchedUser.id && a.type === "early_adopter"
            );
            if (
              !hasEarlyAdopter &&
              matchedUser.createdAt instanceof Date &&
              matchedUser.createdAt < earlyAdopterDate
            ) {
              await useStore
                .getState()
                .unlockAward(matchedUser.id, "early_adopter");
            }

            // Check portfolio-based awards on sign-in
            const stateSnapshot = useStore.getState();
            const userPortfolios = stateSnapshot.portfolios.filter(
              (p) => p.userId === matchedUser!.id
            );
            const portfolioValue = userPortfolios.reduce((total, p) => {
              const stock = stateSnapshot.stocks.find(
                (s) => s.id === p.stockId
              );
              return total + (stock ? stock.currentPrice * p.shares : 0);
            }, 0);

            const hasPortfolio1k = awardsData.some(
              (a) =>
                a.userId === matchedUser.id && a.type === "portfolio_value_1000"
            );
            if (!hasPortfolio1k && portfolioValue >= 1000) {
              await useStore
                .getState()
                .unlockAward(matchedUser.id, "portfolio_value_1000");
            }

            const hasPortfolio10k = awardsData.some(
              (a) =>
                a.userId === matchedUser.id &&
                a.type === "portfolio_value_10000"
            );
            if (!hasPortfolio10k && portfolioValue >= 10000) {
              await useStore
                .getState()
                .unlockAward(matchedUser.id, "portfolio_value_10000");
            }

            const uniqueStocks = new Set(userPortfolios.map((p) => p.stockId));
            const hasDiversified = awardsData.some(
              (a) =>
                a.userId === matchedUser.id &&
                a.type === "diversified_portfolio"
            );
            if (!hasDiversified && uniqueStocks.size >= 5) {
              await useStore
                .getState()
                .unlockAward(matchedUser.id, "diversified_portfolio");
            }
          }
        } else {
          // Not signed in: keep currentUser null (guest)
          useStore.setState({ currentUser: null });
        }
      } catch (error) {
        console.warn(
          "Failed to load from database, using initial data:",
          error
        );
        useStore.setState({
          users: initialUsers,
          stocks: initialStocks,
          transactions: initialTransactions,
          priceHistory: initialStocks.map((s) => ({
            id: `ph-init-${s.id}`,
            stockId: s.id,
            price: s.currentPrice,
            timestamp: s.createdAt,
          })),
          portfolios: initialPortfolios,
          comments: initialComments,
          buybackOffers: initialBuybackOffers,
          notifications: initialNotifications,
          reports: [...initialReports].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          ),
          appeals: initialAppeals,
          adminActionLogs: initialAdminActionLogs,
          currentUser: null,
        });
      } finally {
        useStore.setState({ isLoading: false });
      }
    };

    loadData();
  }, [user, authLoading]);

  useEffect(() => {
    if (isLoading) return;

    const unsubscribe = databases.client.subscribe(
      `databases.${DATABASE_ID}.collections.${COMMENTS_COLLECTION}.documents`,
      (response) => {
        const event = response.events[0];
        const document = response.payload as any;

        if (event.includes("create")) {
          const newComment = mapComment(document);
          useStore.setState((state) => {
            const existingIndex = state.comments.findIndex(
              (c) =>
                c.id === newComment.id ||
                (c.id.startsWith("temp-") &&
                  c.userId === newComment.userId &&
                  c.content === newComment.content &&
                  c.animeId === newComment.animeId &&
                  c.parentId === newComment.parentId &&
                  Math.abs(
                    c.timestamp.getTime() - newComment.timestamp.getTime()
                  ) < 10000)
            );

            if (existingIndex !== -1) {
              const oldComment = state.comments[existingIndex];
              return {
                comments: state.comments.map((c) => {
                  if (c.id === oldComment.id) {
                    return newComment;
                  } else if (c.parentId === oldComment.id) {
                    return { ...c, parentId: newComment.id };
                  }
                  return c;
                }),
              };
            }

            return { comments: [...state.comments, newComment] };
          });
        } else if (event.includes("update")) {
          const updatedComment = mapComment(document);
          useStore.setState((state) => ({
            comments: state.comments.map((c) =>
              c.id === updatedComment.id ? updatedComment : c
            ),
          }));
        } else if (event.includes("delete")) {
          const deletedId = document.$id;
          useStore.setState((state) => ({
            comments: state.comments.filter((c) => c.id !== deletedId),
          }));
        }
      }
    );

    return () => unsubscribe();
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    const notificationsUnsub = databases.client.subscribe(
      `databases.${DATABASE_ID}.collections.${NOTIFICATIONS_COLLECTION}.documents`,
      (response) => {
        const event = response.events[0];
        const document = response.payload as any;

        if (event.includes("create")) {
          const newNotification = mapNotification(document);
          useStore.setState((state) => ({
            notifications: state.notifications.some(
              (n) => n.id === newNotification.id
            )
              ? state.notifications
              : [...state.notifications, newNotification],
          }));
        } else if (event.includes("update")) {
          const updatedNotification = mapNotification(document);
          useStore.setState((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === updatedNotification.id ? updatedNotification : n
            ),
          }));
        } else if (event.includes("delete")) {
          const deletedId = document.$id;
          useStore.setState((state) => ({
            notifications: state.notifications.filter(
              (n) => n.id !== deletedId
            ),
          }));
        }
      }
    );

    const friendsUnsub = databases.client.subscribe(
      `databases.${DATABASE_ID}.collections.${FRIENDS_COLLECTION}.documents`,
      (response) => {
        const event = response.events[0];
        const document = response.payload as any;

        if (event.includes("create")) {
          const newFriend = mapFriend(document);
          useStore.setState((state) => ({
            friends: state.friends.some((f) => f.id === newFriend.id)
              ? state.friends
              : [...state.friends, newFriend],
          }));
        } else if (event.includes("update")) {
          const updatedFriend = mapFriend(document);
          useStore.setState((state) => ({
            friends: state.friends.map((f) =>
              f.id === updatedFriend.id ? updatedFriend : f
            ),
          }));
        } else if (event.includes("delete")) {
          const deletedId = document.$id;
          useStore.setState((state) => ({
            friends: state.friends.filter((f) => f.id !== deletedId),
          }));
        }
      }
    );

    return () => {
      try {
        notificationsUnsub();
      } catch {}
      try {
        friendsUnsub();
      } catch {}
    };
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    const stockUnsub = databases.client.subscribe(
      `databases.${DATABASE_ID}.collections.${STOCKS_COLLECTION}.documents`,
      (response) => {
        const event = response.events[0];
        const document = response.payload as any;

        if (event.includes("create")) {
          const newStock = mapStock(document);
          useStore.setState((state) => ({
            stocks: [...state.stocks, newStock],
          }));
        } else if (event.includes("update")) {
          const updatedStock = mapStock(document);
          useStore.setState((state) => ({
            stocks: state.stocks.map((s) =>
              s.id === updatedStock.id ? updatedStock : s
            ),
          }));
        } else if (event.includes("delete")) {
          const deletedId = document.$id;
          useStore.setState((state) => ({
            stocks: state.stocks.filter((s) => s.id !== deletedId),
          }));
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
          useStore.setState((state) => ({
            priceHistory: [...state.priceHistory, newPH],
            stocks: state.stocks.map((s) =>
              s.id === newPH.stockId ? { ...s, currentPrice: newPH.price } : s
            ),
          }));
        }
      }
    );

    return () => {
      try {
        stockUnsub();
      } catch {}
      try {
        priceUnsub();
      } catch {}
    };
  }, [isLoading]);

  return <>{children}</>;
}
