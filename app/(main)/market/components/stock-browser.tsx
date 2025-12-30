"use client";

import { useState, useMemo } from "react";
import { StockCard } from "@/components/stock-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  List,
  Search,
  Activity,
  Zap,
} from "lucide-react";
import type { Stock } from "@/lib/types";
import { useStore } from "@/lib/store";

type SortMode =
  | "most_active"
  | "trending"
  | "price_desc"
  | "price_asc"
  | "rarest"
  | "newest";
type ViewMode = "grid" | "list";

interface StockBrowserProps {
  stocks: Stock[];
  onBuy: (stockId: string) => void;
}

export function StockBrowser({ stocks, onBuy }: StockBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("most_active");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showCount, setShowCount] = useState(12);
  const { transactions } = useStore();

  // Calculate transaction count for each stock
  const stockTransactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach((transaction) => {
      counts[transaction.stockId] = (counts[transaction.stockId] || 0) + 1;
    });
    return counts;
  }, [transactions]);

  // Filter and sort stocks
  const displayedStocks = useMemo(() => {
    let filtered = stocks;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = stocks.filter(
        (stock) =>
          stock.characterName.toLowerCase().includes(query) ||
          stock.anime.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    let sorted = [...filtered];
    switch (sortMode) {
      case "most_active":
        sorted.sort((a, b) => {
          const aCount = stockTransactionCounts[a.id] || 0;
          const bCount = stockTransactionCounts[b.id] || 0;
          return bCount - aCount;
        });
        break;
      case "trending":
        // Combine recent activity and market cap
        sorted.sort((a, b) => {
          const aActivity = stockTransactionCounts[a.id] || 0;
          const aMarketCap = a.currentPrice * a.totalShares;
          const bActivity = stockTransactionCounts[b.id] || 0;
          const bMarketCap = b.currentPrice * b.totalShares;
          const aScore = aActivity * 2 + aMarketCap;
          const bScore = bActivity * 2 + bMarketCap;
          return bScore - aScore;
        });
        break;
      case "price_desc":
        sorted.sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case "price_asc":
        sorted.sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case "rarest":
        sorted.sort((a, b) => a.availableShares - b.availableShares);
        break;
      case "newest":
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
    }

    return sorted.slice(0, showCount);
  }, [stocks, searchQuery, sortMode, showCount, stockTransactionCounts]);

  const totalCount = stocks.filter(
    (stock) =>
      !searchQuery.trim() ||
      stock.characterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.anime.toLowerCase().includes(searchQuery.toLowerCase())
  ).length;

  return (
    <div id="browse-stocks" className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:items-end sm:justify-between">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Search Stocks
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Find a character or anime..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowCount(12); // Reset to initial count on search
                }}
                className="pl-10 h-10"
              />
            </div>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-3 flex-1">
            {/* Sort Dropdown */}
            <div className="flex-1 sm:max-w-xs">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Sort by
              </label>
              <Select
                value={sortMode}
                onValueChange={(v) => setSortMode(v as SortMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trending">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Trending
                    </div>
                  </SelectItem>
                  <SelectItem value="most_active">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Most Active
                    </div>
                  </SelectItem>
                  <SelectItem value="price_desc">Highest Price</SelectItem>
                  <SelectItem value="price_asc">Lowest Price</SelectItem>
                  <SelectItem value="rarest">Rarest</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results Info */}
        {searchQuery && (
          <div className="text-sm text-muted-foreground">
            Found <Badge variant="secondary">{displayedStocks.length}</Badge> of{" "}
            <Badge variant="secondary">{totalCount}</Badge> stocks
          </div>
        )}
      </div>

      {/* Stocks Grid/List */}
      {displayedStocks.length > 0 ? (
        <>
          <div
            className={
              viewMode === "grid"
                ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid gap-4 sm:grid-cols-2"
            }
          >
            {displayedStocks.map((stock) => (
              <StockCard
                key={stock.id}
                stock={stock}
                onBuy={() => onBuy(stock.id)}
                compact={viewMode === "grid"}
              />
            ))}
          </div>

          {/* Load More Button */}
          {showCount < totalCount && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCount((prev) => prev + 12)}
              >
                Load More
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery
              ? "No stocks found matching your search"
              : "No stocks available"}
          </p>
          {searchQuery && (
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
