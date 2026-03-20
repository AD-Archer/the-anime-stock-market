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

const buildAwardKey = (userId: string, type: Award["type"]) => `${userId}:${type}`;

const normalizeAward = (award: Award): Award => ({
  ...award,
  redeemed: Boolean(award.redeemed),
});

const pickPreferredAward = (left: Award, right: Award): Award => {
  const leftRedeemed = Boolean(left.redeemed);
  const rightRedeemed = Boolean(right.redeemed);
  if (leftRedeemed !== rightRedeemed) {
    return leftRedeemed ? left : right;
  }
  return left.unlockedAt.getTime() <= right.unlockedAt.getTime() ? left : right;
};

const mergeAwardDuplicates = (left: Award, right: Award): Award => {
  const preferred = pickPreferredAward(left, right);
  const unlockedAt =
    left.unlockedAt.getTime() <= right.unlockedAt.getTime()
      ? left.unlockedAt
      : right.unlockedAt;
  return {
    ...preferred,
    unlockedAt,
    redeemed: Boolean(left.redeemed || right.redeemed),
  };
};

const dedupeAwards = (awards: Award[]): Award[] => {
  const byKey = new Map<string, Award>();
  awards.forEach((award) => {
    const normalized = normalizeAward(award);
    const key = buildAwardKey(normalized.userId, normalized.type);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, normalized);
      return;
    }
    byKey.set(key, mergeAwardDuplicates(existing, normalized));
  });
  return Array.from(byKey.values());
};

export function createAwardActions({
  setState,
  getState,
}: StoreMutators) {
  const unlockInFlight = new Set<string>();

  const setAwards = (
    updater: Award[] | ((prev: Award[]) => Award[])
  ) =>
    setState((state) => ({
      awards: dedupeAwards(applyUpdater(state.awards, updater)),
    }));

  const unlockAward = async (userId: string, type: Award["type"]) => {
    const key = buildAwardKey(userId, type);
    if (unlockInFlight.has(key)) {
      return;
    }

    const state = getState();
    const existingAward = state.awards.find(
      (award) => award.userId === userId && award.type === type
    );

    if (existingAward) {
      return; // Already unlocked
    }

    unlockInFlight.add(key);

    const latest = getState().awards.find(
      (award) => award.userId === userId && award.type === type
    );
    if (latest) {
      unlockInFlight.delete(key);
      return;
    }

    const existingOnServer = await awardService.getByUserAndType(userId, type);
    if (existingOnServer) {
      setAwards((prev) => [...prev, existingOnServer]);
      unlockInFlight.delete(key);
      return;
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
      const duplicate = await awardService.getByUserAndType(userId, type);
      if (duplicate) {
        setAwards((prev) =>
          [...prev.filter((a) => a.id !== newAward.id), duplicate]
        );
      } else {
        // Remove from local state on failure
        setAwards((prev) => prev.filter((a) => a.id !== newAward.id));
      }
    } finally {
      unlockInFlight.delete(key);
    }
  };

  const getUserAwards = (userId: string): Award[] => {
    const state = getState();
    return dedupeAwards(
      state.awards.filter((award) => award.userId === userId)
    );
  };

  const redeemAward = async (awardId: string) => {
    const state = getState();
    const currentUser = state.currentUser;
    if (!currentUser) return false;

    const award = state.awards.find(
      (a) => a.id === awardId && a.userId === currentUser.id
    );
    if (!award || award.redeemed) return false;

    const sameTypeAwards = state.awards.filter(
      (a) => a.userId === currentUser.id && a.type === award.type
    );
    if (sameTypeAwards.length === 0) return false;

    // One-time reward should only be redeemable once per award type.
    if (sameTypeAwards.some((a) => Boolean(a.redeemed))) {
      const unreconciledIds = sameTypeAwards
        .filter((a) => !a.redeemed)
        .map((a) => a.id);
      if (unreconciledIds.length > 0) {
        setAwards((prev) =>
          prev.map((a) =>
            a.userId === currentUser.id && a.type === award.type
              ? { ...a, redeemed: true }
              : a
          )
        );
        void Promise.allSettled(
          unreconciledIds.map((id) => awardService.update(id, { redeemed: true }))
        );
      }
      return false;
    }

    const value = awardRedeemValues[award.type];
    if (!value || value <= 0) return false;

    const sameTypeAwardIds = sameTypeAwards.map((a) => a.id);
    const previousAwardsById = new Map(
      sameTypeAwards.map((existing) => [existing.id, existing])
    );

    // Mark every duplicate row for this award type as redeemed to avoid repeat claims.
    setAwards((prev) =>
      prev.map((a) =>
        a.userId === currentUser.id && a.type === award.type
          ? { ...a, redeemed: true }
          : a
      )
    );

    // Update user balance
    const updatedUser = { ...currentUser, balance: currentUser.balance + value };
    setState((s) => ({
      currentUser: updatedUser,
      users: s.users.map((u) => (u.id === currentUser.id ? { ...u, balance: updatedUser.balance } : u)),
    }));

    try {
      await Promise.all([
        ...sameTypeAwardIds.map((id) =>
          awardService.update(id, { redeemed: true })
        ),
        userService.update(currentUser.id, { balance: updatedUser.balance }),
      ]);
      return true;
    } catch (error) {
      console.error("Failed to redeem award:", error);
      // Revert changes
      setAwards((prev) =>
        prev.map((a) => previousAwardsById.get(a.id) ?? a)
      );
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
