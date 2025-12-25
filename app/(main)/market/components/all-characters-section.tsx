"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateAnimeSlug } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { Stock } from "@/lib/types";

interface AllCharactersSectionProps {
  stocks: Stock[];
  onBuy: (stockId: string) => void;
}

type SortMode =
  | "most_active"
  | "marketcap"
  | "price_desc"
  | "price_asc"
  | "rarest"
  | "recommended"
  | "newest"
  | "oldest";

export function AllCharactersSection({
  stocks,
  onBuy,
}: AllCharactersSectionProps) {
  const { getStockPriceHistory, transactions } = useStore();
  const priceHistory = useStore((state) => state.priceHistory);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCount, setShowCount] = useState(20); // Initially show 20 characters
  const [sortMode, setSortMode] = useState<SortMode>("marketcap");
  const router = useRouter();

  // Calculate transaction count for each stock
  const stockTransactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach((transaction) => {
      counts[transaction.stockId] = (counts[transaction.stockId] || 0) + 1;
    });
    return counts;
  }, [transactions]);

  const filteredStocks = useMemo(() => {
    const historyVersion = priceHistory.length; // ensure recompute when price history updates
    const withChange = stocks.map((stock) => {
      const history = getStockPriceHistory(stock.id);
      let priceChange = 0;
      if (history.length > 1) {
        const startPrice = history[0].price || 0;
        const latestPrice = history[history.length - 1].price || 0;
        if (startPrice > 0) {
          priceChange = ((latestPrice - startPrice) / startPrice) * 100;
        }
      }
      return { ...stock, priceChange };
    });

    let filtered = withChange;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = withChange.filter(
        (stock) =>
          stock.characterName.toLowerCase().includes(query) ||
          stock.anime.toLowerCase().includes(query)
      );
    }

    // Apply sorting based on sortMode
    switch (sortMode) {
      case "most_active":
        filtered.sort((a, b) => {
          const aCount = stockTransactionCounts[a.id] || 0;
          const bCount = stockTransactionCounts[b.id] || 0;
          return bCount - aCount;
        });
        break;
      case "price_desc":
        filtered.sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case "price_asc":
        filtered.sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case "rarest":
        filtered.sort((a, b) => a.availableShares - b.availableShares);
        break;
      case "recommended":
        // For recommended, use market cap descending as heuristic
        filtered.sort(
          (a, b) =>
            b.currentPrice * b.totalShares - a.currentPrice * a.totalShares
        );
        break;
      case "newest":
        filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "oldest":
        filtered.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      default:
        // marketcap
        filtered.sort(
          (a, b) =>
            b.currentPrice * b.totalShares - a.currentPrice * a.totalShares
        );
        break;
    }

    return filtered.slice(0, showCount);
  }, [
    stocks,
    searchQuery,
    showCount,
    sortMode,
    getStockPriceHistory,
    priceHistory.length,
    stockTransactionCounts,
  ]);

  const handleCharacterClick = (stock: Stock & { priceChange?: number }) => {
    router.push(`/character/${stock.characterSlug || stock.id}`);
  };

  const handleAnimeClick = (anime: string) => {
    router.push(`/anime/${generateAnimeSlug(anime)}`);
  };

  return (
    <div className="mt-12">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            All Characters
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Select
            value={sortMode}
            onValueChange={(value) => setSortMode(value as SortMode)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most_active">Most Active</SelectItem>
              <SelectItem value="marketcap">Most Market Cap</SelectItem>
              <SelectItem value="price_desc">Most Expensive</SelectItem>
              <SelectItem value="price_asc">Least Expensive</SelectItem>
              <SelectItem value="rarest">Rarest</SelectItem>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative sm:min-w-[260px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search characters or anime..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredStocks.map((stock) => (
          <div
            key={stock.id}
            className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleCharacterClick(stock)}
          >
            <div className="aspect-square mb-3 overflow-hidden rounded-md bg-muted relative">
              <Image
                src={
                  stock.imageUrl ||
                  `/characters/${stock.characterName
                    .toLowerCase()
                    .replace(/\s+/g, "-")}.jpg`
                }
                alt={stock.characterName}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover"
                unoptimized
              />
            </div>

            <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-1">
              {stock.characterName}
            </h3>

            <p
              className="text-xs text-muted-foreground mb-2 hover:text-foreground transition-colors line-clamp-1"
              onClick={(e) => {
                e.stopPropagation();
                handleAnimeClick(stock.anime);
              }}
            >
              {stock.anime}
            </p>

            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-foreground">
                ${(stock.currentPrice || 0).toFixed(2)}
              </span>
              <span
                className={`text-xs ${
                  (stock.priceChange || 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {(stock.priceChange || 0) >= 0 ? "+" : ""}
                {(stock.priceChange || 0).toFixed(2)}%
              </span>
            </div>

            <Button
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onBuy(stock.id);
              }}
            >
              Buy
            </Button>
          </div>
        ))}
      </div>

      {filteredStocks.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No characters found matching &quot;{searchQuery}&quot;.
          </p>
        </div>
      )}

      {/* Show More Button */}
      {!searchQuery && stocks.length > showCount && (
        <div className="col-span-full flex justify-center mt-6">
          <Button
            onClick={() => setShowCount((prev) => prev + 25)}
            variant="outline"
            className="px-8"
          >
            Show More
          </Button>
        </div>
      )}

      {/* Show all when searching */}
      {searchQuery &&
        filteredStocks.length >= showCount &&
        stocks.length > filteredStocks.length && (
          <div className="col-span-full text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredStocks.length} of {stocks.length} characters
            </p>
          </div>
        )}
    </div>
  );
}
