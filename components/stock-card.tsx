"use client";

import { useEffect, useMemo } from "react";
import type { Stock } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  formatCompactNumber,
  formatCurrencySmart,
  formatCurrency,
  generateAnimeSlug,
} from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface StockCardProps {
  stock: Stock;
  onBuy?: () => void;
  showDescription?: boolean;
  compact?: boolean;
}

export function StockCard({
  stock,
  onBuy,
  showDescription = false,
  compact = true,
}: StockCardProps) {
  const schedulePriceHistoryLoad = useStore(
    (state) => state.schedulePriceHistoryLoad
  );
  const priceHistory = useStore((state) => state.priceHistory);
  const stockHistory = useMemo(() => {
    return priceHistory
      .filter((ph) => ph.stockId === stock.id)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [priceHistory, stock.id]);

  useEffect(() => {
    schedulePriceHistoryLoad([stock.id], { minEntries: 2, limit: 6 });
  }, [stock.id, schedulePriceHistoryLoad]);

  // Calculate price change
  const meaningfulHistory = useMemo(() => {
    const nonInit = stockHistory.filter(
      (ph) => ph.price > 0 && !ph.id.startsWith("ph-init-")
    );
    if (nonInit.length >= 2) return nonInit;
    const nonZero = stockHistory.filter((ph) => ph.price > 0);
    return nonZero.length >= 2 ? nonZero : stockHistory;
  }, [stockHistory]);

  const latestPrice =
    stock.currentPrice > 0
      ? stock.currentPrice
      : meaningfulHistory.at(-1)?.price;
  const previousPrice =
    meaningfulHistory.length >= 2
      ? meaningfulHistory[meaningfulHistory.length - 2]?.price
      : meaningfulHistory.at(-1)?.price ?? latestPrice;

  const priceChange =
    latestPrice !== undefined && previousPrice !== undefined
      ? latestPrice - previousPrice
      : 0;
  const priceChangePercent =
    previousPrice && previousPrice !== 0
      ? (priceChange / previousPrice) * 100
      : 0;

  const isPositive = priceChange > 0;
  const isNegative = priceChange < 0;

  if (compact) {
    return (
      <Link href={`/character/${stock.characterSlug || stock.id}`}>
        <Card className="overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full flex flex-col">
          <CardHeader className="p-0 flex-shrink-0">
            <div className="relative w-full aspect-square overflow-hidden bg-muted">
              <Image
                src={stock.imageUrl || "/placeholder.svg"}
                alt={stock.characterName}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          </CardHeader>
          <CardContent className="p-3 flex-grow flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground line-clamp-2">
                {stock.characterName}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {stock.anime}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-baseline justify-between">
                <p className="text-lg font-bold text-foreground">
                  {formatCurrencySmart(stock.currentPrice)}
                </p>
                <div className="flex items-center gap-1">
                  {isPositive && (
                    <TrendingUp className="h-3 w-3 text-chart-4 flex-shrink-0" />
                  )}
                  {isNegative && (
                    <TrendingDown className="h-3 w-3 text-destructive flex-shrink-0" />
                  )}
                  {!isPositive && !isNegative && (
                    <Minus className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                  <Badge
                    variant={
                      isPositive
                        ? "default"
                        : isNegative
                        ? "destructive"
                        : "secondary"
                    }
                    className={`px-1.5 py-0 text-xs leading-none ${
                      isPositive
                        ? "bg-chart-4 text-background hover:bg-chart-4/80"
                        : ""
                    }`}
                  >
                    {isPositive && "+"}
                    {priceChangePercent.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCompactNumber(stock.availableShares)} /
                {formatCompactNumber(stock.totalShares)}
              </p>
            </div>
          </CardContent>
          {onBuy && (
            <CardFooter className="p-2 pt-0 flex-shrink-0">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  onBuy();
                }}
                className="w-full"
                size="sm"
              >
                Buy
              </Button>
            </CardFooter>
          )}
        </Card>
      </Link>
    );
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg">
      <Link href={`/character/${stock.characterSlug || stock.id}`}>
        <CardHeader className="p-0 cursor-pointer">
          <div className="relative aspect-square w-full overflow-hidden bg-muted">
            <Image
              src={stock.imageUrl || "/placeholder.svg"}
              alt={stock.characterName}
              fill
              className="object-cover"
            />
          </div>
        </CardHeader>
      </Link>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/character/${stock.characterSlug || stock.id}`}>
              <h3 className="text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-1">
                {stock.characterName}
              </h3>
            </Link>
            <Link
              href={`/anime/${generateAnimeSlug(stock.anime)}`}
              className="text-xs hover:underline text-muted-foreground"
            >
              {stock.anime}
            </Link>
          </div>
        </div>
        {showDescription && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {stock.description}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 items-start sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xl font-bold text-foreground">
              {formatCurrencySmart(stock.currentPrice)}
            </p>
            <div className="flex items-center gap-1">
              {isPositive && <TrendingUp className="h-4 w-4 text-chart-4" />}
              {isNegative && (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              {!isPositive && !isNegative && (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <Badge
                variant={
                  isPositive
                    ? "default"
                    : isNegative
                    ? "destructive"
                    : "secondary"
                }
                className={`px-2 py-1 text-xs ${
                  isPositive
                    ? "bg-chart-4 text-background hover:bg-chart-4/80"
                    : ""
                }`}
              >
                {isPositive && "+"}
                {priceChangePercent.toFixed(2)}%
              </Badge>
            </div>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-muted-foreground">Shares available</p>
            <p className="text-sm font-semibold text-foreground">
              {formatCompactNumber(stock.availableShares)} /
              {formatCompactNumber(stock.totalShares)}
            </p>
          </div>
        </div>
      </CardContent>
      {onBuy && (
        <CardFooter className="p-4 pt-0">
          <Button onClick={onBuy} className="w-full" size="sm">
            Buy Stock
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
