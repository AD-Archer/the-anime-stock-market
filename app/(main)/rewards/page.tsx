"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  Flame,
  Trophy,
  Calendar,
  TrendingUp,
  Clock,
  Coins,
  Award,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AwardsSection } from "../users/components/awards-section";

const STREAK_MILESTONES = [
  { days: 1, bonus: 0, name: "Daily Login", icon: Calendar },
  { days: 3, bonus: 25, name: "3-Day Streak", icon: Flame },
  { days: 7, bonus: 100, name: "Week Warrior", icon: Award },
  { days: 14, bonus: 250, name: "Two Week Champion", icon: TrendingUp },
  { days: 30, bonus: 500, name: "Monthly Master", icon: Trophy },
  { days: 60, bonus: 1000, name: "Dedication Award", icon: Trophy },
  { days: 90, bonus: 2000, name: "Quarterly Legend", icon: Trophy },
  { days: 180, bonus: 5000, name: "Half-Year Hero", icon: Trophy },
  { days: 365, bonus: 10000, name: "Annual Emperor", icon: Trophy },
];

export default function RewardsPage() {
  const currentUser = useStore((state) => state.currentUser);
  const dailyRewards = useStore((state) => state.dailyRewards);
  const { claimDailyReward, getDailyRewardInfo, getUserAwards } = useStore();
  const { toast } = useToast();
  const [claiming, setClaiming] = useState(false);
  const [claimedOptimistic, setClaimedOptimistic] = useState(false);

  const rewardInfo = getDailyRewardInfo();
  const userDailyReward = dailyRewards.find(
    (dr) => dr.userId === currentUser?.id
  );

  const handleClaim = async () => {
    setClaiming(true);
    setClaimedOptimistic(true);
    try {
      const result = await claimDailyReward();
      if (result.success) {
        toast({
          title: "Daily Reward Claimed! 🎉",
          description: result.message,
        });
      } else {
        toast({
          title: "Cannot Claim",
          description: result.message,
          variant: "destructive",
        });
        // Revert optimistic state on failure
        setClaimedOptimistic(false);
      }
    } finally {
      setClaiming(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <Gift className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Daily Rewards</CardTitle>
            <CardDescription>
              Sign in to claim your daily rewards and build your streak!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentStreak = userDailyReward?.currentStreak || 0;
  const longestStreak = userDailyReward?.longestStreak || 0;
  const totalClaimed = userDailyReward?.totalClaimed || 0;
  const totalEarned = userDailyReward?.totalAmount || 0;
  const userAwards = currentUser ? getUserAwards(currentUser.id) : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Daily Rewards</h1>
          <p className="text-muted-foreground">
            Claim your daily reward and build your streak for bigger bonuses!
          </p>
        </div>

        {/* Main Claim Card */}
        <Card className="border-primary/50 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Gift className="h-20 w-20 text-primary" />
                {rewardInfo?.canClaim && (
                  <div className="absolute -top-2 -right-2">
                    <div className="h-6 w-6 bg-primary rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            </div>
            <CardTitle className="text-3xl">
              {claimedOptimistic || claiming
                ? "Daily Reward Claimed!"
                : rewardInfo?.canClaim
                ? "Daily Reward Available!"
                : "Come Back Tomorrow"}
            </CardTitle>
            <CardDescription className="text-lg">
              {claimedOptimistic || !rewardInfo?.canClaim ? (
                <span className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  Already Claimed Today
                </span>
              ) : (
                <span className="text-primary font-bold text-2xl">
                  ${rewardInfo.nextRewardAmount}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleClaim}
              disabled={!rewardInfo?.canClaim || claiming || claimedOptimistic}
              size="lg"
              className="w-full text-lg py-6"
            >
              {claiming ? (
                "Claiming..."
              ) : rewardInfo?.canClaim ? (
                <>
                  <Coins className="h-5 w-5 mr-2" />
                  Claim ${rewardInfo.nextRewardAmount}
                </>
              ) : (
                "Already Claimed Today"
              )}
            </Button>

            {/* Current Streak Display */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold">{currentStreak}</div>
                  <div className="text-sm text-muted-foreground">
                    Current Streak
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold">{longestStreak}</div>
                  <div className="text-sm text-muted-foreground">
                    Longest Streak
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Claim History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Claims:</span>
                <span className="font-bold">{totalClaimed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Earned:</span>
                <span className="font-bold text-primary">${totalEarned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Average per Claim:
                </span>
                <span className="font-bold">
                  $
                  {totalClaimed > 0
                    ? Math.round(totalEarned / totalClaimed)
                    : 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Base reward: $50 every 24 hours</p>
              <p>• Streak bonus: +$5 per day (up to +$150)</p>
              <p>• Keep your streak alive by claiming within 48 hours</p>
              <p>• Earn massive bonuses at milestone streaks!</p>
            </CardContent>
          </Card>
        </div>

        {/* Milestone Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Streak Milestones
            </CardTitle>
            <CardDescription>
              Reach these streaks to unlock special bonus rewards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {STREAK_MILESTONES.map((milestone) => {
                const Icon = milestone.icon;
                const achieved = currentStreak >= milestone.days;
                const isNext =
                  !achieved &&
                  currentStreak < milestone.days &&
                  (STREAK_MILESTONES.find(
                    (m, i) => i > 0 && m.days > currentStreak
                  )?.days === milestone.days ||
                    milestone.days === 1);

                return (
                  <div
                    key={milestone.days}
                    className={`relative rounded-lg border p-4 ${
                      achieved
                        ? "bg-primary/10 border-primary"
                        : isNext
                        ? "border-primary/50"
                        : "opacity-50"
                    }`}
                  >
                    {achieved && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="default" className="text-xs">
                          Unlocked
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Icon
                        className={`h-6 w-6 ${
                          achieved ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="font-semibold">{milestone.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {milestone.days} day{milestone.days > 1 ? "s" : ""}
                        </div>
                        {milestone.bonus > 0 && (
                          <div className="text-sm font-bold text-primary mt-1">
                            +${milestone.bonus} bonus
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Awards Section */}
        <AwardsSection awards={userAwards} isOwnProfile={true} />
      </div>
    </div>
  );
}
