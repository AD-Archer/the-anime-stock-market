"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { StockCard } from "@/components/stock-card";
import { BuyDialog } from "@/app/character/components/buy-dialog";
import { MarketChart } from "@/components/market-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function TradingPage() {
  const { stocks, currentUser } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.characterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.anime.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-background">
      {/* Header moved to app layout */}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <MarketChart />
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by character or anime..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stock Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredStocks.map((stock) => (
            <StockCard
              key={stock.id}
              stock={stock}
              onBuy={() => setSelectedStockId(stock.id)}
            />
          ))}
        </div>

        {filteredStocks.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              No stocks found matching your search.
            </p>
          </div>
        )}
      </main>

      {/* Buy Dialog */}
      {selectedStockId && (
        <BuyDialog
          stockId={selectedStockId}
          onClose={() => setSelectedStockId(null)}
        />
      )}
    </div>
  );
}
