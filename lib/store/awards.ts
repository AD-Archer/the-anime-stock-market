import type { StoreApi } from "zustand";
import type { Award } from "../types";
import { awardRedeemValues } from "../award-definitions";
import { awardService, userService } from "../database";
import type { StoreState } from "./types";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

const applyUpdater = <T,>(
  current: T,
  updater: T | ((prev: T) => T)
): T => (typeof updater === "function" ? (updater as (prev: T) => T)(current) : updater);

export function createAwardActions({
  setState,
  getState,
}: StoreMutators) {
  const setAwards = (
    updater: Award[] | ((prev: Award[]) => Award[])
  ) =>
    setState((state) => ({
      awards: applyUpdater(state.awards, updater),
    }));

  const unlockAward = async (userId: string, type: Award["type"]) => {
    const state = getState();
    const existingAward = state.awards.find(
      (award) => award.userId === userId && award.type === type
    );

    if (existingAward) {
      return; // Already unlocked
    }

    const newAward: Award = {
      id: `award-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      type,
      unlockedAt: new Date(),
      redeemed: false,
    };

    setAwards((prev) => [...prev, newAward]);

    try {
      const saved = await awardService.create(newAward);
      setAwards((prev) =>
        prev.map((a) => (a.id === newAward.id ? saved : a))
      );
    } catch (error) {
      console.error("Failed to save award:", error);
      // Remove from local state on failure
      setAwards((prev) => prev.filter((a) => a.id !== newAward.id));
    }
  };

  const getUserAwards = (userId: string): Award[] => {
    const state = getState();
    return state.awards.filter((award) => award.userId === userId);
  };

  const redeemAward = async (awardId: string) => {
    const state = getState();
    const currentUser = state.currentUser;
    if (!currentUser) return false;

    const award = state.awards.find((a) => a.id === awardId && a.userId === currentUser.id);
    if (!award || award.redeemed) return false;

    const value = awardRedeemValues[award.type];
    if (!value || value <= 0) return false;

    // Update award as redeemed
    const updatedAward = { ...award, redeemed: true };
    setAwards((prev) => prev.map((a) => (a.id === awardId ? updatedAward : a)));

    // Update user balance
    const updatedUser = { ...currentUser, balance: currentUser.balance + value };
    setState((s) => ({
      currentUser: updatedUser,
      users: s.users.map((u) => (u.id === currentUser.id ? { ...u, balance: updatedUser.balance } : u)),
    }));

    try {
      await Promise.all([
        awardService.update(awardId, { redeemed: true }),
        userService.update(currentUser.id, { balance: updatedUser.balance }),
      ]);
      return true;
    } catch (error) {
      console.error("Failed to redeem award:", error);
      // Revert changes
      setAwards((prev) => prev.map((a) => (a.id === awardId ? award : a)));
      setState((s) => ({
        currentUser,
        users: s.users.map((u) => (u.id === currentUser.id ? { ...u, balance: currentUser.balance } : u)),
      }));
      return false;
    }
  };

  return {
    unlockAward,
    getUserAwards,
    redeemAward,
  };
}