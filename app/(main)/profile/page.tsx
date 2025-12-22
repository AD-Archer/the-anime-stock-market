"use client";

import { useUser } from "@stackframe/stack";
import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  User,
  Wallet,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ProfilePage() {
  const user = useUser({ or: "redirect" });
  const { currentUser, getUserPortfolio, stocks, transactions } = useStore();
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  useEffect(() => {
    setDisplayName(user.displayName || "");
  }, [user.displayName]);

  const portfolio = currentUser ? getUserPortfolio(currentUser.id) : [];
  const userTransactions = currentUser
    ? transactions
        .filter((t) => t.userId === currentUser.id)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    : [];

  // Calculate portfolio stats
  const portfolioStats = portfolio.reduce(
    (acc, p) => {
      const stock = stocks.find((s) => s.id === p.stockId);
      if (!stock) return acc;

      const currentValue = stock.currentPrice * p.shares;
      const invested = p.averageBuyPrice * p.shares;
      const profitLoss = currentValue - invested;
      const profitLossPercent = (profitLoss / invested) * 100;

      const portfolioItem = {
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
      portfolioWithDetails: [] as any[],
      totalPortfolioValue: 0,
      totalInvested: 0,
    }
  );

  const { portfolioWithDetails, totalPortfolioValue, totalInvested } =
    portfolioStats;

  const totalProfitLoss = totalPortfolioValue - totalInvested;
  const totalProfitLossPercent =
    totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
  const totalAssets = currentUser.balance + totalPortfolioValue;

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground">
                  {user.displayName || user.primaryEmail}
                </h1>
                <p className="text-muted-foreground">{user.primaryEmail}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                {isSettingsExpanded ? "Hide Settings" : "Edit Profile"}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Settings */}
        <div
          className={`mb-8 overflow-hidden transition-all duration-300 ease-in-out ${
            isSettingsExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onBlur={async (e) => {
                        const newName = e.target.value.trim();
                        if (newName && newName !== user.displayName) {
                          await user.update({ displayName: newName });
                          setDisplayName(newName);
                        } else if (!newName) {
                          setDisplayName(user.displayName || "");
                        }
                        setIsEditingName(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        } else if (e.key === "Escape") {
                          setDisplayName(user.displayName || "");
                          setIsEditingName(false);
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your display name"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setDisplayName(user.displayName || "");
                        setIsEditingName(false);
                      }}
                      className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 py-2 text-foreground">
                      {user.displayName || "No display name set"}
                    </span>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="px-3 py-2 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <p className="text-sm text-muted-foreground">
                {user.primaryEmail}
              </p>
              <p className="text-xs text-muted-foreground">
                Email cannot be changed here. Contact support if needed.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Passkeys</label>
              <p className="text-sm text-muted-foreground mb-2">
                Add a passkey for passwordless authentication. Passkeys provide
                secure, passwordless login.
              </p>
              {user.passkeys && user.passkeys.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium mb-1">
                    Registered Passkeys:
                  </p>
                  <ul className="text-sm text-muted-foreground">
                    {user.passkeys.map((passkey, index) => (
                      <li key={index}>• Passkey {index + 1}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={async () => {
                  try {
                    await user.addPasskey();
                  } catch (error) {
                    console.error("Failed to add passkey:", error);
                    alert("Failed to add passkey. Please try again.");
                  }
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Add Passkey
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}

        {/* Stats Overview */}
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Assets
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ${totalAssets.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Cash + Portfolio Value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cash Balance
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ${currentUser.balance.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Available to trade
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Portfolio Value
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ${totalPortfolioValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {portfolio.length} holdings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total P/L</CardTitle>
              {totalProfitLoss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-chart-4" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  totalProfitLoss >= 0 ? "text-chart-4" : "text-destructive"
                }`}
              >
                {totalProfitLoss >= 0 ? "+" : ""}${totalProfitLoss.toFixed(2)}
              </div>
              <p
                className={`text-xs ${
                  totalProfitLoss >= 0 ? "text-chart-4" : "text-destructive"
                }`}
              >
                {totalProfitLoss >= 0 ? "+" : ""}
                {totalProfitLossPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio & History */}
        <Card>
          <CardHeader>
            <CardTitle>Trading Activity</CardTitle>
            <CardDescription>
              Your portfolio and transaction history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="portfolio">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="portfolio">
                  Portfolio ({portfolio.length})
                </TabsTrigger>
                <TabsTrigger value="history">
                  Transaction History ({userTransactions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="portfolio" className="space-y-4">
                {portfolioWithDetails.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    No holdings yet. Start trading to build your portfolio!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {portfolioWithDetails.map((item) => {
                      if (!item) return null;
                      const isProfit = item.profitLoss >= 0;

                      return (
                        <Link
                          key={item.stockId}
                          href={`/character/${item.stockId}`}
                        >
                          <div className="flex items-center gap-4 rounded-lg border p-4 transition-all hover:bg-muted">
                            <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                              <Image
                                src={item.stock.imageUrl || "/placeholder.svg"}
                                alt={item.stock.characterName}
                                fill
                                className="object-cover"
                              />
                            </div>

                            <div className="flex-1">
                              <h3 className="font-bold text-foreground">
                                {item.stock.characterName}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {item.stock.anime}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.shares} shares
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                Avg Buy Price
                              </p>
                              <p className="font-mono text-foreground">
                                ${item.averageBuyPrice.toFixed(2)}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                Current Price
                              </p>
                              <p className="font-mono text-foreground">
                                ${item.stock.currentPrice.toFixed(2)}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                Market Value
                              </p>
                              <p className="font-mono font-semibold text-foreground">
                                ${item.currentValue.toFixed(2)}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                P/L
                              </p>
                              <p
                                className={`font-mono font-semibold ${
                                  isProfit ? "text-chart-4" : "text-destructive"
                                }`}
                              >
                                {isProfit ? "+" : ""}$
                                {item.profitLoss.toFixed(2)}
                              </p>
                              <p
                                className={`text-xs ${
                                  isProfit ? "text-chart-4" : "text-destructive"
                                }`}
                              >
                                {isProfit ? "+" : ""}
                                {item.profitLossPercent.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                {userTransactions.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    No transactions yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {userTransactions.map((tx) => {
                      const stock = stocks.find((s) => s.id === tx.stockId);
                      if (!stock) return null;

                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                              <Image
                                src={stock.imageUrl || "/placeholder.svg"}
                                alt={stock.characterName}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground">
                                  {stock.characterName}
                                </p>
                                <Badge
                                  variant={
                                    tx.type === "buy" ? "default" : "secondary"
                                  }
                                >
                                  {tx.type}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {tx.shares} shares @ $
                                {tx.pricePerShare.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-mono font-semibold text-foreground">
                              ${tx.totalAmount.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tx.timestamp.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
