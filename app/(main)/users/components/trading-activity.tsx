"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, type ReactNode } from "react";
import type { Stock, Transaction } from "@/lib/types";
import { SellDialog } from "@/components/sell-dialog";

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
  const [sellTarget, setSellTarget] = useState<{ stockId: string; maxShares: number } | null>(
    null
  );

  const tabColsClass = settingsContent ? "grid-cols-3" : "grid-cols-2";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading Activity</CardTitle>
        <CardDescription>Your portfolio and transaction history</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(val) =>
            onTabChange?.(val as "portfolio" | "history" | "settings")
          }
        >
          <TabsList className={`grid w-full ${tabColsClass}`}>
            <TabsTrigger value="portfolio">Portfolio ({portfolio.length})</TabsTrigger>
            <TabsTrigger value="history">Transaction History ({transactions.length})</TabsTrigger>
            {settingsContent && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>

          <TabsContent value="portfolio" className="space-y-4">
            {portfolio.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No holdings yet. Start trading to build your portfolio!
              </p>
            ) : (
              <div className="space-y-3">
                {portfolio.map((item) => {
                  const isProfit = item.profitLoss >= 0;

                  return (
                    <div
                      key={item.stockId}
                      className="flex flex-col gap-3 rounded-lg border p-4 transition-all hover:bg-muted"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                            <Image
                              src={item.stock.imageUrl || "/placeholder.svg"}
                              alt={item.stock.characterName}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground truncate">
                              {item.stock.characterName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {item.stock.anime}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.shares} shares
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">P/L</p>
                          <p
                            className={`font-mono font-semibold ${
                              isProfit ? "text-chart-4" : "text-destructive"
                            }`}
                          >
                            {isProfit ? "+" : ""}${item.profitLoss.toFixed(2)}
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Avg Buy Price</p>
                          <p className="font-mono text-foreground">
                            ${item.averageBuyPrice.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current Price</p>
                          <p className="font-mono text-foreground">
                            ${item.stock.currentPrice.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Market Value</p>
                          <p className="font-mono font-semibold text-foreground">
                            ${item.currentValue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Link href={`/character/${item.stockId}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSellTarget({ stockId: item.stockId, maxShares: item.shares })}
                        >
                          Sell
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {transactions.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex flex-col gap-2 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                          <Image
                            src={tx.stock.imageUrl || "/placeholder.svg"}
                            alt={tx.stock.characterName}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground truncate">
                              {tx.stock.characterName}
                            </p>
                            <Badge variant={tx.type === "buy" ? "default" : "secondary"}>
                              {tx.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <p className="font-mono font-semibold text-foreground">
                        ${tx.totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <p>
                          {tx.shares} shares @ ${tx.pricePerShare.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right sm:text-left">
                        <p>
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
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {settingsContent && (
            <TabsContent value="settings" className="space-y-4">
              {settingsContent}
            </TabsContent>
          )}
        </Tabs>

        {sellTarget && (
          <SellDialog
            stockId={sellTarget.stockId}
            maxShares={sellTarget.maxShares}
            onClose={() => setSellTarget(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
