"use client";

import { useEffect, useMemo, useState } from "react";
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
import { LayoutGrid, List, Search, Activity, Zap } from "lucide-react";
import type { Stock } from "@/lib/types";

type SortMode =
  | "most_active"
  | "trending"
  | "price_desc"
  | "price_asc"
  | "rarest"
  | "newest";
type ViewMode = "grid" | "list";

interface StockBrowserProps {
  onBuy: (stockId: string) => void;
}

const PAGE_SIZE = 24;

export function StockBrowser({ onBuy }: StockBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("most_active");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    const tid = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 250);
    return () => clearTimeout(tid);
  }, [searchQuery]);

  const queryValue = useMemo(
    () => (debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : ""),
    [debouncedQuery]
  );

  const loadPage = async (reset = false) => {
    if (isLoading && !reset) return;
    setIsLoading(true);
    try {
      const pageOffset = reset ? 0 : offset;
      const res = await fetch(
        `/api/stocks/browse?sort=${encodeURIComponent(
          sortMode
        )}&limit=${PAGE_SIZE}&offset=${pageOffset}${queryValue}`
      );

      if (!res.ok) {
        throw new Error(`Failed to load stocks (${res.status})`);
      }

      const data = await res.json();
      const incoming = Array.isArray(data?.items) ? (data.items as Stock[]) : [];

      setStocks((prev) => {
        if (reset) return incoming;
        const map = new Map(prev.map((stock) => [stock.id, stock]));
        incoming.forEach((stock) => map.set(stock.id, stock));
        return Array.from(map.values());
      });
      setOffset(typeof data?.nextOffset === "number" ? data.nextOffset : 0);
      setHasMore(Boolean(data?.hasMore));
      setHasLoadedOnce(true);
    } catch (error) {
      console.error("Failed to load stock browser page:", error);
      if (reset) {
        setStocks([]);
        setHasMore(false);
        setOffset(0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    setHasMore(false);
    setHasLoadedOnce(false);
    loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode, queryValue]);

  const displayedStocks = stocks;

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
            Showing <Badge variant="secondary">{displayedStocks.length}</Badge>{" "}
            matching stocks
          </div>
        )}
      </div>

      {/* Stocks Grid/List */}
      {displayedStocks.length > 0 ? (
        <>
          <div
            className={
              viewMode === "grid"
                ? "grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
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
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => loadPage(false)}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          {isLoading && !hasLoadedOnce ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center">
              <p className="text-muted-foreground">Loading stocks...</p>
            </div>
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
        </>
      )}
    </div>
  );
}
