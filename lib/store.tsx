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
  DATABASE_ID,
  COMMENTS_COLLECTION,
  STOCKS_COLLECTION,
  PRICE_HISTORY_COLLECTION,
  mapComment,
  mapPriceHistory,
  mapStock,
} from "./database";
import { createNotificationActions } from "./store/notifications";
import { createCommentActions } from "./store/comments";
import { createUserActions } from "./store/user-actions";
import { createMarketActions } from "./store/market";
import { createReportActions } from "./store/reports";
import { createMessageActions } from "./store/messages";
import type { StoreState } from "./store/types";
import type { User } from "./types";

export const useStore = create<StoreState>((set, get) => {
  const notificationActions = createNotificationActions({ setState: set, getState: get });
  const commentActions = createCommentActions({ setState: set, getState: get });
  const userActions = createUserActions({ setState: set, getState: get });
  const marketActions = createMarketActions({
    setState: set,
    getState: get,
    sendNotification: notificationActions.sendNotification,
  });
  const reportActions = createReportActions({
    setState: set,
    getState: get,
    buildThreadContext: commentActions.buildThreadContext,
    describeCommentLocation: commentActions.describeCommentLocation,
    deleteComment: commentActions.deleteComment,
  });
  const messageActions = createMessageActions({ setState: set, getState: get });

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
    messages: [],
    conversations: [],
    ...notificationActions,
    ...commentActions,
    ...userActions,
    ...marketActions,
    ...reportActions,
    ...messageActions,
  };
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const isLoading = useStore((state) => state.isLoading);

  useEffect(() => {
    if (authLoading) return;

    const loadData = async () => {
      useStore.setState({ isLoading: true, authUser: user ? { id: user.id } : null });
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
        ]);

        useStore.setState({
          users: usersData.length > 0 ? usersData : initialUsers,
          stocks: stocksData.length > 0 ? stocksData : initialStocks,
          transactions: transactionsData.length > 0 ? transactionsData : initialTransactions,
          buybackOffers: buybackOffersData.length > 0 ? buybackOffersData : initialBuybackOffers,
          comments: commentsData.length > 0 ? commentsData : initialComments,
          reports: (reportsData.length > 0 ? reportsData : initialReports).sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          ),
          notifications: (notificationsData.length > 0
            ? notificationsData
            : initialNotifications
          ).sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          ),
          priceHistory: priceHistoryData.length > 0 ? priceHistoryData : initialPriceHistory,
          portfolios: portfoliosData.length > 0 ? portfoliosData : initialPortfolios,
        });

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
                hideTransactions: false,
                anonymousTransactions: false,
              });
              matchedUser = created;
              useStore.setState((state) => ({ users: [...state.users, created] }));
            } catch (e) {
              console.warn(
                "Failed to create user record for Appwrite account",
                e
              );
            }
          }

          if (matchedUser) useStore.setState({ currentUser: matchedUser });
        } else if (initialUsers.length > 0) {
          useStore.setState({ currentUser: initialUsers[0] });
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
          priceHistory: initialPriceHistory,
          portfolios: initialPortfolios,
          comments: initialComments,
          buybackOffers: initialBuybackOffers,
          notifications: initialNotifications,
          reports: [...initialReports].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          ),
          currentUser: initialUsers[0] || null,
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

    const stockUnsub = databases.client.subscribe(
      `databases.${DATABASE_ID}.collections.${STOCKS_COLLECTION}.documents`,
      (response) => {
        const event = response.events[0];
        const document = response.payload as any;

        if (event.includes("create")) {
          const newStock = mapStock(document);
          useStore.setState((state) => ({ stocks: [...state.stocks, newStock] }));
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
