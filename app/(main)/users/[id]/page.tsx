"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
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
    isLoading,
  } = useStore();

  const profileUser = users.find((user) => user.id === id);
  const isOwnProfile = authUser?.id === profileUser?.id;

  const portfolio = useMemo(() => {
    if (!profileUser) return [];
    return getUserPortfolio(profileUser.id);
  }, [getUserPortfolio, profileUser]);

  const portfolioStats = useMemo(() => {
    return portfolio.reduce(
      (acc, p) => {
        const stock = stocks.find((s) => s.id === p.stockId);
        if (!stock) return acc;

        const currentValue = stock.currentPrice * p.shares;
        const invested = p.averageBuyPrice * p.shares;
        const profitLoss = currentValue - invested;
        const profitLossPercent = invested > 0 ? (profitLoss / invested) * 100 : 0;

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

  const { portfolioWithDetails, totalPortfolioValue, totalInvested } = portfolioStats;
  const totalProfitLoss = totalPortfolioValue - totalInvested;
  const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
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
        if (!stock) return null;
        return { ...tx, stock };
      })
      .filter(Boolean) as Array<Transaction & { stock: Stock }>;
  }, [isOwnProfile, profileUser, stocks, transactions]);

  const userComments = useMemo(() => {
    if (!profileUser) return [];
    return comments
      .filter((comment) => comment.userId === profileUser.id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [comments, profileUser]);

  const [activeTab, setActiveTab] = useState<"portfolio" | "history" | "settings">(
    "portfolio"
  );

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
    key: "showSpoilers" | "showNsfw" | "isPortfolioPublic" | "hideTransactions" | "anonymousTransactions",
    value: boolean
  ) => {
    if (!isOwnProfile) return;
    await updateContentPreferences({ [key]: value });
  };

  if (isLoading && !profileUser) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg text-muted-foreground">Loading user...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg text-muted-foreground">User not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <UserHeader
          profileUser={profileUser}
          isOwnProfile={!!isOwnProfile}
          canMessage={!!currentUser}
          isSettingsOpen={activeTab === "settings"}
          onShare={handleShare}
          onMessage={handleMessage}
          onToggleSettings={() =>
            setActiveTab((prev) => (prev === "settings" ? "portfolio" : "settings"))
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
                onUpdateName={updateName}
                onUpdatePassword={updatePassword}
                onUpdatePreferences={handlePreferenceChange}
              />
            }
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Visibility</CardTitle>
              <CardDescription>
                {profileUser.isPortfolioPublic
                  ? "Current holdings (if public) and performance."
                  : "This user has chosen to keep their holdings private."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileUser.isPortfolioPublic ? (
                portfolioWithDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No holdings available.</p>
                ) : (
                  <div className="space-y-4">
                    {portfolioWithDetails.map((holding) => (
                      <div
                        key={holding.stockId}
                        className="rounded border p-3 flex items-center justify-between"
                      >
                        <div>
                          <CardTitle className="text-base font-semibold">
                            {holding.stock.characterName}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">{holding.stock.anime}</p>
                          <p className="text-xs text-muted-foreground">
                            {holding.shares} shares @ ${holding.averageBuyPrice.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Value</p>
                          <p className="text-lg font-bold">${holding.currentValue.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Portfolio is private.</p>
              )}
            </CardContent>
          </Card>
        )}

        <CommentsSection comments={userComments} stocks={stocks} />

        {!isOwnProfile && profileUser.hideTransactions && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">Private</Badge>
            This user hides their transaction history.
          </div>
        )}
      </div>
    </div>
  );
}
