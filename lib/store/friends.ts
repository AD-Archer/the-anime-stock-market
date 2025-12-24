import type { StoreApi } from "zustand";
import type { Friend, User } from "../types";
import { friendService } from "../database";
import type { StoreState } from "./types";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

const applyUpdater = <T>(current: T, updater: T | ((prev: T) => T)): T =>
  typeof updater === "function"
    ? (updater as (prev: T) => T)(current)
    : updater;

export function createFriendActions({ setState, getState }: StoreMutators) {
  const setFriends = (updater: Friend[] | ((prev: Friend[]) => Friend[])) =>
    setState((state) => ({
      friends: applyUpdater(state.friends || [], updater),
    }));

  const getUserFriends = (userId: string): User[] => {
    const state = getState();
    const relationships = (state.friends || []).filter(
      (f) =>
        f.status === "accepted" &&
        (f.requesterId === userId || f.receiverId === userId)
    );
    const otherIds = relationships.map((f) =>
      f.requesterId === userId ? f.receiverId : f.requesterId
    );
    return state.users.filter((u) => otherIds.includes(u.id));
  };

  const getPendingFriendRequests = (userId: string): Friend[] => {
    const state = getState();
    return (state.friends || []).filter(
      (f) => f.status === "pending" && f.receiverId === userId
    );
  };

  const sendFriendRequest = async (targetUserId: string) => {
    const state = getState();
    const currentUser = state.currentUser;
    if (!currentUser) return;

    // Avoid duplicates
    const existing = (state.friends || []).find(
      (f) =>
        (f.requesterId === currentUser.id && f.receiverId === targetUserId) ||
        (f.requesterId === targetUserId && f.receiverId === currentUser.id)
    );
    if (existing) return;

    const record: Friend = {
      id: `friend-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      requesterId: currentUser.id,
      receiverId: targetUserId,
      status: "pending",
      createdAt: new Date(),
    };

    setFriends((prev) => [...prev, record]);

    try {
      const saved = await friendService.create(record);
      setFriends((prev) => prev.map((f) => (f.id === record.id ? saved : f)));

      // Send notification to receiver after persistence so it can be acted on.
      const requesterName =
        state.users.find((u) => u.id === currentUser.id)?.username || "A user";
      state.sendNotification(
        targetUserId,
        "friend_request",
        "New Friend Request",
        `${requesterName} sent you a friend request`,
        { requesterId: currentUser.id, requestId: saved.id }
      );
    } catch (error) {
      console.warn("Failed to send friend request:", error);
      setFriends((prev) => prev.filter((f) => f.id !== record.id));
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    const state = getState();
    const currentUser = state.currentUser;
    if (!currentUser) return;

    const request = (state.friends || []).find((f) => f.id === requestId);
    if (
      !request ||
      request.receiverId !== currentUser.id ||
      request.status !== "pending"
    )
      return;

    const updated: Friend = {
      ...request,
      status: "accepted",
      respondedAt: new Date(),
    };

    setFriends((prev) => prev.map((f) => (f.id === requestId ? updated : f)));

    try {
      const saved = await friendService.update(requestId, {
        status: "accepted",
        respondedAt: new Date(),
      });
      setFriends((prev) => prev.map((f) => (f.id === requestId ? saved : f)));
    } catch (error) {
      console.warn("Failed to accept friend request:", error);
      setFriends((prev) => prev.map((f) => (f.id === requestId ? request : f)));
      return;
    }

    // Unlock award for both users on first accepted friend
    const unlock = state.unlockAward;
    const myFriends = getUserFriends(currentUser.id);
    if (unlock && myFriends.length === 0) {
      await unlock(currentUser.id, "social_butterfly");
    }
    const other = request.requesterId;
    const otherFriends = getUserFriends(other);
    if (unlock && otherFriends.length === 0) {
      await unlock(other, "social_butterfly");
    }
  };

  const declineFriendRequest = async (requestId: string) => {
    const state = getState();
    const currentUser = state.currentUser;
    if (!currentUser) return;

    const request = (state.friends || []).find((f) => f.id === requestId);
    if (
      !request ||
      request.receiverId !== currentUser.id ||
      request.status !== "pending"
    )
      return;

    const updated: Friend = {
      ...request,
      status: "declined",
      respondedAt: new Date(),
    };

    setFriends((prev) => prev.map((f) => (f.id === requestId ? updated : f)));

    try {
      const saved = await friendService.update(requestId, {
        status: "declined",
        respondedAt: new Date(),
      });
      setFriends((prev) => prev.map((f) => (f.id === requestId ? saved : f)));
    } catch (error) {
      console.warn("Failed to decline friend request:", error);
      setFriends((prev) => prev.map((f) => (f.id === requestId ? request : f)));
    }
  };

  return {
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    getUserFriends,
    getPendingFriendRequests,
  };
}
