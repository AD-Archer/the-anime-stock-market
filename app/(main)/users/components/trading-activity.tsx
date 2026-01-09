"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, type ReactNode } from "react";
import type { Stock, Transaction } from "@/lib/types";
import { SellDialog } from "@/components/sell-dialog";
import {
  Briefcase,
  History,
  Settings,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

export type PortfolioWithDetails = {
  stockId: string;
  shares: number;
  averageBuyPrice: number;
  stock: Stock;
  currentValue: number;
  invested: number;
  profitLoss: number;
  profitLossPercent: number;
};

type TradingActivityProps = {
  portfolio: PortfolioWithDetails[];
  transactions: Array<Transaction & { stock: Stock }>;
  settingsContent?: ReactNode;
  activeTab?: "portfolio" | "history" | "settings";
  onTabChange?: (tab: "portfolio" | "history" | "settings") => void;
};

export function TradingActivity({
  portfolio,
  transactions,
  settingsContent,
  activeTab = "portfolio",
  onTabChange,
}: TradingActivityProps) {
  const [sellTarget, setSellTarget] = useState<{
    stockId: string;
    maxShares: number;
  } | null>(null);

  const tabs = [
    ...(settingsContent
      ? [{ id: "settings" as const, label: "Settings", icon: Settings }]
      : []),
    {
      id: "portfolio" as const,
      label: "Portfolio",
      icon: Briefcase,
      count: portfolio.length,
    },
    {
      id: "history" as const,
      label: "History",
      icon: History,
      count: transactions.length,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {"count" in tab && tab.count !== undefined && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-xl">
        {activeTab === "portfolio" && (
          <div className="p-4 sm:p-6">
            {portfolio.length === 0 ? (
              <div className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No holdings yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start trading to build your portfolio!
                </p>
                <Button asChild className="mt-4">
                  <Link href="/market">Browse Market</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {portfolio.map((item) => {
                  const isProfit = item.profitLoss >= 0;
                  return (
                    <div
                      key={item.stockId}
                      className="group flex flex-col gap-4 rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/character/${
                            item.stock.characterSlug || item.stock.id
                          }`}
                          className="relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-xl flex-shrink-0"
                        >
                          <Image
                            src={item.stock.imageUrl || "/placeholder.svg"}
                            alt={item.stock.characterName}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/character/${
                              item.stock.characterSlug || item.stock.id
                            }`}
                            className="font-semibold text-foreground hover:text-primary transition-colors truncate block"
                          >
                            {item.stock.characterName}
                          </Link>
                          <p className="text-sm text-muted-foreground truncate">
                            {item.stock.anime}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.shares.toLocaleString()} shares @ $
                            {item.stock.currentPrice.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-foreground">
                            ${item.currentValue.toFixed(2)}
                          </p>
                          <div
                            className={`flex items-center justify-end gap-1 text-sm ${
                              isProfit ? "text-green-500" : "text-red-500"
                            }`}
                          >
                            {isProfit ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            <span>
                              {isProfit ? "+" : ""}${item.profitLoss.toFixed(2)}
                            </span>
                            <span className="text-xs">
                              ({isProfit ? "+" : ""}
                              {item.profitLossPercent.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/character/${
                              item.stock.characterSlug || item.stock.id
                            }`}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSellTarget({
                              stockId: item.stockId,
                              maxShares: item.shares,
                            })
                          }
                        >
                          Sell
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="p-4 sm:p-6">
            {transactions.length === 0 ? (
              <div className="py-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your trading history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const isBuy = tx.type === "buy";
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          isBuy ? "bg-green-500/10" : "bg-red-500/10"
                        }`}
                      >
                        {isBuy ? (
                          <ArrowDownRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg flex-shrink-0">
                        <Image
                          src={tx.stock.imageUrl || "/placeholder.svg"}
                          alt={tx.stock.characterName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/character/${
                              tx.stock.characterSlug || tx.stock.id
                            }`}
                            className="font-medium text-foreground hover:text-primary transition-colors truncate"
                          >
                            {tx.stock.characterName}
                          </Link>
                          <Badge
                            variant={isBuy ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {tx.type.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tx.shares} shares @ ${tx.pricePerShare.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`font-mono font-semibold ${
                            isBuy ? "text-green-500" : "text-foreground"
                          }`}
                        >
                          {isBuy ? "-" : "+"}${tx.totalAmount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.timestamp.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && settingsContent && (
          <div className="p-4 sm:p-6">{settingsContent}</div>
        )}
      </div>

      {sellTarget && (
        <SellDialog
          stockId={sellTarget.stockId}
          maxShares={sellTarget.maxShares}
          onClose={() => setSellTarget(null)}
        />
      )}
    </div>
  );
}
