"use client";

import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PortfolioCard } from "@/app/(main)/portfolio/components/portfolio-card";
import { TransactionHistory } from "@/components/transaction-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Wallet, TrendingDown, Activity } from "lucide-react";
import Link from "next/link";

export default function PortfolioPage() {
  const { user } = useAuth();
  const { currentUser, getUserPortfolio, stocks, transactions } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/auth/signin");
    }
  }, [user, router]);

  if (!user || !currentUser) {
    return (
      <div
        className="container mx-auto px-4 py-8"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-10 w-56 rounded-md bg-muted" />
            <div className="h-4 w-72 rounded-md bg-muted" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-xl border bg-card p-6 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="h-4 w-32 rounded-md bg-muted" />
                  <div className="h-8 w-40 rounded-md bg-muted" />
                  <div className="h-3 w-28 rounded-md bg-muted" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-xl border bg-card p-6 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="h-5 w-40 rounded-md bg-muted" />
                  <div className="h-3 w-full rounded-md bg-muted" />
                  <div className="h-3 w-5/6 rounded-md bg-muted" />
                  <div className="h-64 w-full rounded-md bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const portfolio = currentUser
    ? getUserPortfolio(currentUser.id).filter((p) =>
        stocks.some((s) => s.id === p.stockId)
      )
    : [];
  const userTransactions = transactions
    .filter((t) => t.userId === currentUser?.id)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Calculate portfolio value and profit/loss
  let totalValue = 0;
  let totalInvested = 0;
  let totalProfitLoss = 0;

  portfolio.forEach((p) => {
    const stock = stocks.find((s) => s.id === p.stockId);
    if (stock) {
      const currentValue = stock.currentPrice * p.shares;
      const invested = p.averageBuyPrice * p.shares;
      totalValue += currentValue;
      totalInvested += invested;
      totalProfitLoss += currentValue - invested;
    }
  });

  const profitLossPercent =
    totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
  const totalAssets = (currentUser?.balance || 0) + totalValue;

  return (
    <div className="bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="mb-6 text-3xl font-bold text-foreground">
            My Portfolio
          </h2>

          {/* Stats Grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Assets
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
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
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Portfolio Value
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ${totalValue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current market value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Profit/Loss
                </CardTitle>
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
                  {profitLossPercent.toFixed(2)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Holdings
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {portfolio.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Different stocks owned
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Portfolio Holdings */}
          {portfolio.length > 0 ? (
            <div className="mb-8">
              <h3 className="mb-4 text-xl font-semibold text-foreground">
                Holdings
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {portfolio.map((p) => {
                  const stock = stocks.find((s) => s.id === p.stockId);
                  if (!stock) return null;
                  return (
                    <PortfolioCard
                      key={p.stockId}
                      portfolio={p}
                      stock={stock}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <Card className="mb-8">
              <CardContent className="py-12 text-center">
                <p className="mb-4 text-muted-foreground">
                  You don&apos;t have any stocks yet. Start trading to build
                  your portfolio!
                </p>
                <Link href="/market">
                  <Button>Browse Market</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Transaction History */}
          <div>
            <h3 className="mb-4 text-xl font-semibold text-foreground">
              Transaction History
            </h3>
            <TransactionHistory transactions={userTransactions} />
          </div>
        </div>
      </main>
    </div>
  );
}
