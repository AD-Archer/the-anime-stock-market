"use client";

import { useStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Trophy, Medal, Award } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LeaderboardPage() {
  const { stocks, getStockPriceHistory } = useStore();

  // Calculate market cap for each stock and sort
  const rankedStocks = stocks
    .map((stock) => {
      const priceHistory = getStockPriceHistory(stock.id);
      const marketCap = stock.currentPrice * stock.totalShares;

      // Calculate price change
      let priceChange = 0;
      if (priceHistory.length >= 2) {
        const previousPrice = priceHistory[priceHistory.length - 2].price;
        priceChange =
          ((stock.currentPrice - previousPrice) / previousPrice) * 100;
      }

      return {
        ...stock,
        marketCap,
        priceChange,
      };
    })
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 100);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return null;
  };

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-foreground">
            Top 100 Characters
          </h1>
          <p className="text-muted-foreground">
            The highest valued anime character stocks by market capitalization
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>
              Ranked by total market cap (Price × Total Shares)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rankedStocks.map((stock, index) => {
                const rank = index + 1;
                const isPositive = stock.priceChange > 0;
                const isNegative = stock.priceChange < 0;

                return (
                  <Link key={stock.id} href={`/character/${stock.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border p-4 transition-all hover:bg-muted hover:shadow-md">
                      {/* Rank and Image */}
                      <div className="flex items-center gap-4 sm:w-auto">
                        <div className="flex w-12 items-center justify-center">
                          {getRankIcon(rank) || (
                            <span className="text-2xl font-bold text-muted-foreground">
                              {rank}
                            </span>
                          )}
                        </div>
                        <div className="relative h-16 w-16 overflow-hidden rounded-lg flex-shrink-0">
                          <Image
                            src={stock.imageUrl || "/placeholder.svg"}
                            alt={stock.characterName}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>

                      {/* Character Info and Stats */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-bold text-foreground">
                              {stock.characterName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {stock.anime}
                            </p>
                          </div>

                          {/* Price and Change */}
                          <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
                            <p className="text-xl font-bold text-foreground">
                              ${stock.currentPrice.toFixed(2)}
                            </p>
                            <div className="flex items-center justify-end gap-1">
                              {isPositive && (
                                <TrendingUp className="h-3 w-3 text-chart-4" />
                              )}
                              {isNegative && (
                                <TrendingDown className="h-3 w-3 text-destructive" />
                              )}
                              <span
                                className={`text-sm font-medium ${
                                  isPositive
                                    ? "text-chart-4"
                                    : isNegative
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {isPositive && "+"}
                                {stock.priceChange.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Market Cap and Shares - Mobile stacked */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2 pt-2 border-t border-border sm:border-0 sm:pt-0">
                          <div className="text-sm">
                            <p className="text-muted-foreground">Market Cap</p>
                            <p className="font-mono font-semibold text-foreground">
                              ${stock.marketCap.toFixed(2)}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="self-start sm:self-auto"
                          >
                            {stock.availableShares.toLocaleString()} /{" "}
                            {stock.totalShares.toLocaleString()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {rankedStocks.length === 0 && (
              <p className="py-12 text-center text-muted-foreground">
                No stocks available yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
