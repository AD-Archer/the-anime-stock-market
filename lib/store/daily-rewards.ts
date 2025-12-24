import type { StoreApi } from "zustand";
import type { StoreState } from "./types";
import { dailyRewardService } from "../database/dailyRewardService";
import { userService } from "../database";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

// Base reward is $50
const BASE_REWARD = 50;

// Streak multipliers and milestones
const STREAK_MILESTONES = [
  { days: 1, bonus: 0, name: "Daily Login" },
  { days: 3, bonus: 25, name: "3-Day Streak" },
  { days: 7, bonus: 100, name: "Week Warrior" },
  { days: 14, bonus: 250, name: "Two Week Champion" },
  { days: 30, bonus: 500, name: "Monthly Master" },
  { days: 60, bonus: 1000, name: "Dedication Award" },
  { days: 90, bonus: 2000, name: "Quarterly Legend" },
  { days: 180, bonus: 5000, name: "Half-Year Hero" },
  { days: 365, bonus: 10000, name: "Annual Emperor" },
];

// Calculate reward amount based on streak
function calculateReward(streak: number): {
  amount: number;
  milestone?: string;
} {
  let amount = BASE_REWARD;
  let milestone: string | undefined;

  // Add streak bonus (increases by $5 per day up to a cap)
  const streakBonus = Math.min(streak - 1, 30) * 5;
  amount += streakBonus;

  // Check for milestone bonuses
  for (const ms of STREAK_MILESTONES) {
    if (streak === ms.days && ms.bonus > 0) {
      amount += ms.bonus;
      milestone = ms.name;
      break;
    }
  }

  return { amount, milestone };
}

// Check if enough time has passed (24 hours)
function canClaimReward(lastClaimDate: Date | undefined): boolean {
  if (!lastClaimDate) return true;

  const now = new Date();
  const hoursSinceLastClaim =
    (now.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastClaim >= 24;
}

// Check if streak should continue
function shouldContinueStreak(lastClaimDate: Date | undefined): boolean {
  if (!lastClaimDate) return false;

  const now = new Date();
  const hoursSinceLastClaim =
    (now.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60);
  // Streak continues if claimed within 48 hours (gives 24 hour grace period)
  return hoursSinceLastClaim < 48;
}

export function createDailyRewardActions({
  setState,
  getState,
}: StoreMutators) {
  return {
    claimDailyReward: async () => {
      const state = getState();
      const currentUser = state.currentUser;

      if (!currentUser) {
        return {
          success: false,
          message: "You must be logged in to claim daily rewards",
        };
      }

      // Check if user can claim
      if (!canClaimReward(currentUser.lastDailyRewardClaim)) {
        const hoursUntil =
          24 -
          Math.floor(
            (new Date().getTime() -
              currentUser.lastDailyRewardClaim!.getTime()) /
              (1000 * 60 * 60)
          );
        return {
          success: false,
          message: `You can claim your next daily reward in ${hoursUntil} hours`,
        };
      }

      try {
        // Get or create daily reward record
        let dailyReward = state.dailyRewards.find(
          (dr) => dr.userId === currentUser.id
        );

        const continueStreak = dailyReward
          ? shouldContinueStreak(dailyReward.lastClaimDate)
          : false;
        const newStreak = continueStreak
          ? (dailyReward?.currentStreak || 0) + 1
          : 1;

        const { amount, milestone } = calculateReward(newStreak);

        const now = new Date();

        if (dailyReward) {
          // Update existing record
          const updatedReward = await dailyRewardService.update(
            dailyReward.id,
            {
              lastClaimDate: now,
              currentStreak: newStreak,
              longestStreak: Math.max(newStreak, dailyReward.longestStreak),
              totalClaimed: dailyReward.totalClaimed + 1,
              totalAmount: dailyReward.totalAmount + amount,
            }
          );

          setState((prev: StoreState) => ({
            dailyRewards: prev.dailyRewards.map((dr) =>
              dr.id === dailyReward!.id ? updatedReward : dr
            ),
          }));
        } else {
          // Create new record
          const newReward = await dailyRewardService.create({
            userId: currentUser.id,
            lastClaimDate: now,
            currentStreak: 1,
            longestStreak: 1,
            totalClaimed: 1,
            totalAmount: amount,
          });

          setState((prev: StoreState) => ({
            dailyRewards: [...prev.dailyRewards, newReward],
          }));
        }

        // Update user balance and lastDailyRewardClaim
        const updatedUser = await userService.update(currentUser.id, {
          balance: currentUser.balance + amount,
          lastDailyRewardClaim: now,
        });

        setState((prev: StoreState) => ({
          currentUser: updatedUser,
          users: prev.users.map((u) =>
            u.id === currentUser.id ? updatedUser : u
          ),
        }));

        let message = `Claimed $${amount}! Current streak: ${newStreak} day${
          newStreak > 1 ? "s" : ""
        }`;
        if (milestone) {
          message += ` 🎉 ${milestone} milestone unlocked!`;
        }

        return {
          success: true,
          amount,
          streak: newStreak,
          message,
        };
      } catch (error) {
        console.error("Failed to claim daily reward:", error);
        return {
          success: false,
          message: "Failed to claim reward. Please try again.",
        };
      }
    },

    getDailyRewardInfo: () => {
      const state = getState();
      const currentUser = state.currentUser;

      if (!currentUser) return null;

      const dailyReward = state.dailyRewards.find(
        (dr) => dr.userId === currentUser.id
      );
      const lastClaimDate = currentUser.lastDailyRewardClaim;

      const canClaim = canClaimReward(lastClaimDate);
      const continueStreak = dailyReward
        ? shouldContinueStreak(dailyReward.lastClaimDate)
        : false;
      const currentStreak =
        canClaim && continueStreak ? dailyReward?.currentStreak || 0 : 0;
      const nextStreak = canClaim
        ? continueStreak
          ? currentStreak + 1
          : 1
        : currentStreak;

      const { amount: nextRewardAmount } = calculateReward(nextStreak);

      let hoursUntilNextClaim = 0;
      if (!canClaim && lastClaimDate) {
        const hoursSinceLastClaim =
          (new Date().getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60);
        hoursUntilNextClaim = Math.max(0, 24 - hoursSinceLastClaim);
      }

      return {
        canClaim,
        currentStreak: dailyReward?.currentStreak || 0,
        nextRewardAmount,
        hoursUntilNextClaim,
      };
    },
  };
}
