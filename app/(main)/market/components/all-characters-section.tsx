"use client";

import { useState, useMemo } from "react";

import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { generateAnimeSlug } from "@/lib/utils";
import { Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface AllCharactersSectionProps {
  stocks: any[];
  onBuy: (stockId: string) => void;
}

export function AllCharactersSection({
  stocks,
  onBuy,
}: AllCharactersSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCount, setShowCount] = useState(20); // Initially show 20 characters
  const router = useRouter();

  const filteredStocks = useMemo(() => {
    let filtered = stocks;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = stocks.filter(
        (stock) =>
          stock.characterName.toLowerCase().includes(query) ||
          stock.anime.toLowerCase().includes(query)
      );
    }
    return filtered.slice(0, showCount);
  }, [stocks, searchQuery, showCount]);

  const handleCharacterClick = (stock: any) => {
    router.push(`/character/${stock.characterSlug || stock.id}`);
  };

  const handleAnimeClick = (anime: string) => {
    // Navigate to anime page
    router.push(`/anime/${generateAnimeSlug(anime)}`);
  };

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6" />
          All Characters
        </h2>

        <div className="flex items-center gap-3 max-w-md">
          <div className="relative flex-1">
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
