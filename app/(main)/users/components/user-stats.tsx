"use client";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  Briefcase,
} from "lucide-react";
import { formatCurrencyCompact } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const cashPercent = totalAssets > 0 ? (cashBalance / totalAssets) * 100 : 0;
  const investedPercent =
    totalAssets > 0 ? (portfolioValue / totalAssets) * 100 : 0;

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {/* Total Assets */}
      <div className="col-span-2 lg:col-span-1 bg-card border border-border rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Total Assets</span>
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-foreground">
          {formatCurrencyCompact(totalAssets, { maximumFractionDigits: 2 })}
        </p>
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                style={{ width: `${investedPercent}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>{investedPercent.toFixed(1)}% invested</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {investedPercent.toFixed(0)}% invested • {cashPercent.toFixed(0)}%
          cash
        </p>
      </div>

      {/* Cash Balance */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Cash</span>
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Wallet className="h-4 w-4 text-emerald-500" />
          </div>
        </div>
        <p className="text-xl sm:text-2xl font-bold text-foreground">
          {formatCurrencyCompact(cashBalance, { maximumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Available to trade</p>
      </div>

      {/* Portfolio Value */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Portfolio</span>
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Briefcase className="h-4 w-4 text-blue-500" />
          </div>
        </div>
        <p className="text-xl sm:text-2xl font-bold text-foreground">
          {formatCurrencyCompact(portfolioValue, { maximumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {holdingsCount} {holdingsCount === 1 ? "holding" : "holdings"}
        </p>
      </div>

      {/* Total P/L */}
      <div
        className={`bg-card border rounded-xl p-4 sm:p-5 ${
          isProfit ? "border-green-500/20" : "border-red-500/20"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Profit/Loss</span>
          <div
            className={`p-2 rounded-lg ${
              isProfit ? "bg-green-500/10" : "bg-red-500/10"
            }`}
          >
            {isProfit ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
        <p
          className={`text-xl sm:text-2xl font-bold ${
            isProfit ? "text-green-500" : "text-red-500"
          }`}
        >
          {isProfit ? "+" : ""}
          {formatCurrencyCompact(totalProfitLoss, { maximumFractionDigits: 2 })}
        </p>
        <p
          className={`text-xs mt-1 ${
            isProfit ? "text-green-500" : "text-red-500"
          }`}
        >
          {isProfit ? "+" : ""}
          {totalProfitLossPercent.toFixed(2)}% all time
        </p>
      </div>
    </div>
  );
}
