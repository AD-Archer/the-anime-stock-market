"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import type { Stock, Transaction } from "@/lib/types";
import { UserHeader } from "../components/user-header";
import { UserStats } from "../components/user-stats";
import {
  TradingActivity,
  type PortfolioWithDetails,
} from "../components/trading-activity";
import { ProfileSettings } from "../components/profile-settings";
import { CommentsSection } from "../components/comments-section";
import { FriendsList } from "../components/friends-list";

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: slug } = use(params);
  const router = useRouter();
  const {
    user: authUser,
    updateName,
    updatePassword,
    loading: authLoading,
  } = useAuth();
  const {
    users,
    currentUser,
    getUserPortfolio,
    stocks,
    comments,
    createConversation,
    transactions,
    updateContentPreferences,
    updateNotificationPreferences,
    setUserAvatar,
    deleteUser,
    friends,
    notifications,
    dailyRewards,
    messages,
    conversations,
    isLoading,
    awards,
    getUserAwards,
  } = useStore();

  const profileUser =
    users.find(
      (user) =>
        user.displaySlug === slug || user.username === slug || user.id === slug
    ) || users.find((user) => user.id === slug);
  const isOwnProfile = authUser?.id === profileUser?.id;

  const portfolio = useMemo(() => {
    if (!profileUser) return [];
    return getUserPortfolio(profileUser.id).filter((p) =>
      stocks.some((s) => s.id === p.stockId)
    );
  }, [getUserPortfolio, profileUser, stocks]);

  const portfolioStats = useMemo(() => {
    return portfolio.reduce(
      (acc, p) => {
        const stock = stocks.find((s) => s.id === p.stockId);
        if (!stock) return acc;

        const currentValue = stock.currentPrice * p.shares;
        const invested = p.averageBuyPrice * p.shares;
        const profitLoss = currentValue - invested;
        const profitLossPercent =
          invested > 0 ? (profitLoss / invested) * 100 : 0;

        const portfolioItem: PortfolioWithDetails = {
          ...p,
          stock,
          currentValue,
          invested,
          profitLoss,
          profitLossPercent,
        };

        return {
          portfolioWithDetails: [...acc.portfolioWithDetails, portfolioItem],
          totalPortfolioValue: acc.totalPortfolioValue + currentValue,
          totalInvested: acc.totalInvested + invested,
        };
      },
      {
        portfolioWithDetails: [] as PortfolioWithDetails[],
        totalPortfolioValue: 0,
        totalInvested: 0,
      }
    );
  }, [portfolio, stocks]);

  const { portfolioWithDetails, totalPortfolioValue, totalInvested } =
    portfolioStats;
  const totalProfitLoss = totalPortfolioValue - totalInvested;
  const totalProfitLossPercent =
    totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
  const totalAssets = (profileUser?.balance || 0) + totalPortfolioValue;

  const userTransactions = useMemo(() => {
    if (!profileUser) return [];

    if (!isOwnProfile && profileUser.hideTransactions) {
      return [];
    }

    return transactions
      .filter((t) => t.userId === profileUser.id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .map((tx) => {
        const stock = stocks.find((s) => s.id === tx.stockId);
        const stockData = stock || {
          id: tx.stockId,
          characterName: "Deleted Stock",
          characterSlug: "",
          anilistCharacterId: 0,
          anilistMediaIds: [],
          anime: "",
          currentPrice: 0,
          createdBy: "",
          createdAt: new Date(),
          imageUrl: "",
          description: "",
          totalShares: 0,
          availableShares: 0,
        };
        return { ...tx, stock: stockData };
      }) as Array<Transaction & { stock: Stock }>;
  }, [isOwnProfile, profileUser, stocks, transactions]);

  const userComments = useMemo(() => {
    if (!profileUser) return [];
    return comments.filter((comment) => comment.userId === profileUser.id);
  }, [comments, profileUser]);

  const userAwards = useMemo(() => {
    if (!profileUser) return [];
    return getUserAwards(profileUser.id);
  }, [getUserAwards, profileUser]);

  const [activeTab, setActiveTab] = useState<
    "settings" | "history" | "portfolio"
  >(isOwnProfile ? "settings" : "portfolio");

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Profile link copied to clipboard!");
  };

  const handleMessage = async () => {
    if (!currentUser || !profileUser) return;

    const conversationId = createConversation([currentUser.id, profileUser.id]);
    router.push(`/messages?conversation=${conversationId}`);
  };

  const handlePreferenceChange = async (
    key:
      | "showSpoilers"
      | "showNsfw"
      | "isPortfolioPublic"
      | "hideTransactions"
      | "anonymousTransactions",
    value: boolean
  ) => {
    if (!isOwnProfile) return;
    await updateContentPreferences({ [key]: value });
  };

  const handleExportData = () => {
    if (!profileUser) return;
    const userId = profileUser.id;
    const conversationIds = new Set(
      conversations
        .filter((conv) => conv.participants.includes(userId))
        .map((conv) => conv.id)
    );
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user: profileUser,
      portfolios: getUserPortfolio(userId),
      transactions: transactions.filter((tx) => tx.userId === userId),
      comments: comments.filter((comment) => comment.userId === userId),
      awards: awards.filter((award) => award.userId === userId),
      friends: friends.filter(
        (friend) =>
          friend.requesterId === userId || friend.receiverId === userId
      ),
      notifications: notifications.filter(
        (notification) => notification.userId === userId
      ),
      dailyRewards: dailyRewards.filter((reward) => reward.userId === userId),
      conversations: conversations.filter((conv) =>
        conv.participants.includes(userId)
      ),
      messages: messages.filter((message) =>
        conversationIds.has(message.conversationId)
      ),
    };

    const data = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const slugName = profileUser.displaySlug || profileUser.username || "user";
    anchor.download = `anime-stock-market-data-${slugName}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = async () => {
    if (!profileUser || !isOwnProfile) return;
    await deleteUser(profileUser.id);
  };

  if (isLoading && !profileUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-6 w-44 rounded-md bg-muted" />
                  <div className="h-4 w-32 rounded-md bg-muted" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-24 rounded-md bg-muted" />
                <div className="h-9 w-24 rounded-md bg-muted" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-xl border bg-card p-6 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="h-4 w-28 rounded-md bg-muted" />
                  <div className="h-8 w-40 rounded-md bg-muted" />
                  <div className="h-3 w-24 rounded-md bg-muted" />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="space-y-3">
              <div className="h-5 w-48 rounded-md bg-muted" />
              <div className="h-3 w-72 rounded-md bg-muted" />
              <div className="h-80 w-full rounded-md bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <p className="text-lg text-muted-foreground">User not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <UserHeader
          profileUser={profileUser}
          isOwnProfile={!!isOwnProfile}
          canMessage={!!currentUser}
          isSettingsOpen={activeTab === "settings"}
          onShare={handleShare}
          onMessage={handleMessage}
          onToggleSettings={() =>
            setActiveTab((prev) =>
              prev === "settings" ? "portfolio" : "settings"
            )
          }
        />

        <UserStats
          totalAssets={totalAssets}
          cashBalance={profileUser.balance}
          portfolioValue={totalPortfolioValue}
          holdingsCount={portfolio.length}
          totalProfitLoss={totalProfitLoss}
          totalProfitLossPercent={totalProfitLossPercent}
        />

        {isOwnProfile ? (
          <TradingActivity
            portfolio={portfolioWithDetails}
            transactions={userTransactions}
            settingsContent={
              <ProfileSettings
                authUser={authUser}
                storeUser={profileUser}
                authLoading={authLoading}
                stocks={stocks}
                onUpdateName={updateName}
                onUpdatePassword={updatePassword}
                onUpdatePreferences={handlePreferenceChange}
                onUpdateNotificationPreferences={updateNotificationPreferences}
                onUpdateAvatar={setUserAvatar}
                onExportData={handleExportData}
                onDeleteAccount={handleDeleteAccount}
              />
            }
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        ) : (
          <div className="bg-card border border-border rounded-xl">
            <div className="p-4 sm:p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Portfolio</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {profileUser.isPortfolioPublic
                  ? "Public holdings and performance"
                  : "This user keeps their holdings private"}
              </p>
            </div>
            <div className="p-4 sm:p-6">
              {profileUser.isPortfolioPublic ? (
                portfolioWithDetails.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No holdings available
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {portfolioWithDetails.map((holding) => {
                      const isProfit = holding.profitLoss >= 0;
                      return (
                        <Link
                          key={holding.stockId}
                          href={`/character/${
                            holding.stock.characterSlug || holding.stock.id
                          }`}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-all"
                        >
                          <div className="relative h-12 w-12 overflow-hidden rounded-lg flex-shrink-0">
                            <Image
                              src={holding.stock.imageUrl || "/placeholder.svg"}
                              alt={holding.stock.characterName}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {holding.stock.characterName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {holding.shares} shares
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-foreground">
                              ${holding.currentValue.toFixed(2)}
                            </p>
                            <p
                              className={`text-xs ${
                                isProfit ? "text-green-500" : "text-red-500"
                              }`}
                            >
                              {isProfit ? "+" : ""}
                              {holding.profitLossPercent.toFixed(1)}%
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Portfolio is private</p>
                </div>
              )}
            </div>
          </div>
        )}

        <CommentsSection comments={userComments} stocks={stocks} />

        {isOwnProfile && <FriendsList />}

        {!isOwnProfile && profileUser.hideTransactions && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 w-fit">
            <Badge variant="secondary">Private</Badge>
            This user hides their transaction history
          </div>
        )}
      </div>
    </div>
  );
}
