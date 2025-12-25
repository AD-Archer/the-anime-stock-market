"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MarketChart } from "@/components/market-chart";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { StockCard } from "@/components/stock-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Activity, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function useCurrentTimestamp(updateIntervalMs = 60000) {
  const [timestamp, setTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(
      () => setTimestamp(Date.now()),
      updateIntervalMs
    );
    return () => clearInterval(interval);
  }, [updateIntervalMs]);

  return timestamp;
}

export function MarketOverview() {
  const { stocks, transactions } = useStore();
  const [filter, setFilter] = useState<
    "most_active" | "most_expensive" | "market_cap"
  >("most_active");

  const latestStock = useMemo(() => {
    if (!stocks.length) return null;
    return [...stocks].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
  }, [stocks]);

  const now = useCurrentTimestamp();
  const isRecent =
    latestStock && now - latestStock.createdAt.getTime() <= 1000 * 60 * 60 * 24;

  // Calculate transaction count for each stock
  const stockTransactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach((transaction) => {
      counts[transaction.stockId] = (counts[transaction.stockId] || 0) + 1;
    });
    return counts;
  }, [transactions]);

  // Calculate transaction volume for each stock
  const stockTransactionVolume = useMemo(() => {
    const volume: Record<string, number> = {};
    transactions.forEach((transaction) => {
      volume[transaction.stockId] =
        (volume[transaction.stockId] || 0) + transaction.totalAmount;
    });
    return volume;
  }, [transactions]);

  const filteredStocks = useMemo(() => {
    let arr = [...stocks];
    switch (filter) {
      case "most_active":
        arr.sort((a, b) => {
          const aCount = stockTransactionCounts[a.id] || 0;
          const bCount = stockTransactionCounts[b.id] || 0;
          return bCount - aCount;
        });
        break;
      case "most_expensive":
        arr.sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case "market_cap":
        arr.sort(
          (a, b) =>
            b.currentPrice * b.totalShares - a.currentPrice * a.totalShares
        );
        break;
      default:
        break;
    }
    return arr.slice(0, 6);
  }, [stocks, filter, stockTransactionCounts]);

  const getFilterLabel = () => {
    switch (filter) {
      case "most_active":
        return "Most Active Characters";
      case "most_expensive":
        return "Most Expensive Characters";
      case "market_cap":
        return "Highest Market Cap";
      default:
        return "Market Overview";
    }
  };

  const getFilterIcon = () => {
    switch (filter) {
      case "most_active":
        return <Activity className="h-5 w-5" />;
      case "most_expensive":
        return <DollarSign className="h-5 w-5" />;
      case "market_cap":
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <TrendingUp className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {latestStock && isRecent && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">New IPO</p>
            <p className="text-lg font-bold text-foreground">
              {latestStock.characterName} ({latestStock.anime})
            </p>
            <p className="text-sm text-muted-foreground">
              Listing price {formatCurrency(latestStock.currentPrice)} •{" "}
              {latestStock.availableShares.toLocaleString()} shares available
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/character/${latestStock.characterSlug || latestStock.id}`}
            >
              <Button>View IPO</Button>
            </Link>
          </div>
        </div>
      )}

      <MarketChart filter={filter} />

      {/* Top Stocks Section */}
      <div className="mt-8 pt-8 border-t">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {getFilterIcon()}
            {getFilterLabel()}
          </h2>

          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most_active">Most Active</SelectItem>
              <SelectItem value="most_expensive">Most Expensive</SelectItem>
              <SelectItem value="market_cap">Highest Market Cap</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 grid-cols-2">
          {filteredStocks.map((stock) => (
            <StockCard key={stock.id} stock={stock} compact onBuy={() => {}} />
          ))}
        </div>

        {filteredStocks.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No stocks available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
