"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StockCard } from "@/components/stock-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  stocks: any[];
  onBuy: (id: string) => void;
}

export function AllStocksSection({ stocks, onBuy }: Props) {
  const PAGE_SIZE = 25; // 5x5 grid
  const [page, setPage] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const paged = stocks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const canLoadMore = (page + 1) * PAGE_SIZE < stocks.length;

  const searchResults = stocks.filter(
    (s) =>
      s.characterName.toLowerCase().includes(query.toLowerCase()) ||
      s.anime.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-foreground">
          Explore Characters
        </h3>
        <div className="flex items-center gap-2">
          <Button onClick={() => setSearchOpen(true)}>Search</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {paged.map((stock) => (
          <StockCard
            key={stock.id}
            stock={stock}
            onBuy={() => onBuy(stock.id)}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        {canLoadMore ? (
          <Button onClick={() => setPage((p) => p + 1)}>Show more</Button>
        ) : (
          <Button variant="outline" disabled>
            No more
          </Button>
        )}
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search Stocks</DialogTitle>
            <div className="mt-2 mb-4">
              <Input
                placeholder="Search characters or anime..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {query ? (
              searchResults.map((s) => (
                <StockCard key={s.id} stock={s} onBuy={() => onBuy(s.id)} />
              ))
            ) : (
              <p className="text-muted-foreground">
                Type to search for characters or anime.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
