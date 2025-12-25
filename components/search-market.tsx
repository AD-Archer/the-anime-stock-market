"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Stock } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";

interface SearchMarketProps {
  stocks: Stock[];
  onSelectStock?: (stock: Stock) => void;
}

export function SearchMarket({ stocks, onSelectStock }: SearchMarketProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return stocks
      .filter(
        (stock) =>
          stock.characterName.toLowerCase().includes(query) ||
          stock.anime.toLowerCase().includes(query)
      )
      .slice(0, 10); // Limit to top 10 results
  }, [searchQuery, stocks]);

  const handleSelect = (stock: Stock) => {
    if (onSelectStock) {
      onSelectStock(stock);
    }
    setSearchQuery("");
    setIsOpen(false);
  };

  return (
    <div className="w-full">
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search characters or anime..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-10 pr-10 h-12 text-base"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setIsOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isOpen && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            {filteredStocks.length > 0 ? (
              <div className="divide-y divide-border">
                {filteredStocks.map((stock) => (
                  <Link
                    key={stock.id}
                    href={`/character/${stock.characterSlug || stock.id}`}
                    onClick={() => handleSelect(stock)}
                  >
                    <div className="p-4 hover:bg-muted cursor-pointer transition-colors flex gap-3 items-start">
                      <div className="relative h-12 w-12 overflow-hidden rounded flex-shrink-0">
                        <Image
                          src={stock.imageUrl || "/placeholder.svg"}
                          alt={stock.characterName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">
                          {stock.characterName}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {stock.anime}
                        </div>
                        <div className="text-sm font-mono text-primary mt-1">
                          ${stock.currentPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No characters found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        )}

        {/* Backdrop to close dropdown */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
