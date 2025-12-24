import type { StoreApi } from "zustand";
import type { Notification } from "../types";
import { notificationService } from "../database";
import type { StoreState } from "./types";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

const applyUpdater = <T,>(
  current: T,
  updater: T | ((prev: T) => T)
): T => (typeof updater === "function" ? (updater as (prev: T) => T)(current) : updater);

export function createNotificationActions({
  setState,
  getState,
}: StoreMutators) {
  const setNotifications = (
    updater: Notification[] | ((prev: Notification[]) => Notification[])
  ) =>
    setState((state) => ({
      notifications: applyUpdater(state.notifications, updater),
    }));

  const sendNotification = (
    userId: string,
    type: Notification["type"],
    title: string,
    message: string,
    data?: any
  ) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: new Date(),
    };
    setNotifications((prev) => [...prev, newNotification]);

    notificationService
      .create(newNotification)
      .then((saved) => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === newNotification.id ? saved : n))
        );
      })
      .catch((error) => {
        console.warn("Failed to persist notification:", error);
      });
  };

  const getUserNotifications = (userId: string): Notification[] => {
    return getState()
      .notifications.filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  const markNotificationRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );

    notificationService
      .update(notificationId, { read: true })
      .catch((error) => {
        console.warn("Failed to update notification status:", error);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: false } : n
          )
        );
      });
  };

  const markAllNotificationsRead = async (userId: string) => {
    const userNotifs = getState().notifications.filter((n) => n.userId === userId && !n.read);
    if (userNotifs.length === 0) return;

    setNotifications((prev) =>
      prev.map((n) => (n.userId === userId ? { ...n, read: true } : n))
    );

    try {
      await Promise.all(
        userNotifs.map((n) =>
          notificationService.update(n.id, { read: true }).catch((error) => {
            console.warn("Failed to mark notification read:", error);
          })
        )
      );
    } catch (error) {
      console.warn("Bulk mark read failed:", error);
    }
  };

  const clearNotifications = async (userId: string) => {
    const userNotifs = getState().notifications.filter((n) => n.userId === userId);
    if (userNotifs.length === 0) return;

    setNotifications((prev) =>
      prev.map((n) => (n.userId === userId ? { ...n, read: true } : n))
    );
    try {
      await Promise.all(
        userNotifs.map((n) =>
          notificationService.update(n.id, { read: true }).catch((error) => {
            console.warn("Failed to mark notification read:", error);
          })
        )
      );
    } catch (error) {
      console.warn("Bulk mark read failed:", error);
    }
  };

  return {
    sendNotification,
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  };
}
