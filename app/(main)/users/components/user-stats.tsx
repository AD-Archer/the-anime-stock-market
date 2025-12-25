"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react";
import { formatCurrencyCompact } from "@/lib/utils";

type UserStatsProps = {
  totalAssets: number;
  cashBalance: number;
  portfolioValue: number;
  holdingsCount: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
};

export function UserStats({
  totalAssets,
  cashBalance,
  portfolioValue,
  holdingsCount,
  totalProfitLoss,
  totalProfitLossPercent,
}: UserStatsProps) {
  const isProfit = totalProfitLoss >= 0;

  return (
    <div className="mb-8 grid gap-6 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrencyCompact(totalAssets, { maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">Cash + Portfolio Value</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrencyCompact(cashBalance, { maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">Available to trade</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrencyCompact(portfolioValue, { maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">{holdingsCount} holdings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total P/L</CardTitle>
          {isProfit ? (
            <TrendingUp className="h-4 w-4 text-chart-4" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              isProfit ? "text-chart-4" : "text-destructive"
            }`}
          >
            {isProfit ? "+" : ""}
            {formatCurrencyCompact(totalProfitLoss, { maximumFractionDigits: 2 })}
          </div>
          <p
            className={`text-xs ${
              isProfit ? "text-chart-4" : "text-destructive"
            }`}
          >
            {isProfit ? "+" : ""}
            {totalProfitLossPercent.toFixed(2)}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
