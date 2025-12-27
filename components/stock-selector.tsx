"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import type { PriceHistory, Stock, Transaction } from "@/lib/types";

type StockSelectorProps = {
  stocks: Stock[];
  selectedStockId?: string;
  onSelect: (stockId: string) => void;
  getStockPriceHistory?: (stockId: string) => PriceHistory[];
  transactions?: Transaction[];
  label?: string;
  placeholder?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
};

export function StockSelector({
  stocks,
  selectedStockId,
  onSelect,
  getStockPriceHistory,
  transactions,
  label,
  placeholder,
  helperText,
  className,
  disabled = false,
}: StockSelectorProps) {
  const [query, setQuery] = useState("");

  const filteredStocks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const transactionCounts = new Map<string, number>();
    if (transactions) {
      transactions.forEach((tx) => {
        transactionCounts.set(
          tx.stockId,
          (transactionCounts.get(tx.stockId) || 0) + 1
        );
      });
    }

    return stocks
      .filter((stock) => {
        if (!normalized) return true;
        return (
          stock.characterName.toLowerCase().includes(normalized) ||
          stock.anime.toLowerCase().includes(normalized)
        );
      })
      .sort((a, b) => {
        const aCount = transactionCounts.get(a.id) || 0;
        const bCount = transactionCounts.get(b.id) || 0;
        if (aCount !== bCount) {
          return bCount - aCount; // Most active first
        }
        return a.characterName.localeCompare(b.characterName);
      });
  }, [query, stocks, transactions]);

  const priceChanges = useMemo(() => {
    const map = new Map<string, number | null>();
    if (!getStockPriceHistory) {
      stocks.forEach((stock) => map.set(stock.id, null));
      return map;
    }

    stocks.forEach((stock) => {
      const history = getStockPriceHistory(stock.id);
      if (history.length < 2) {
        map.set(stock.id, null);
        return;
      }
      const previous = history[history.length - 2];
      if (!previous || previous.price === 0) {
        map.set(stock.id, null);
        return;
      }
      const change =
        ((stock.currentPrice - previous.price) / previous.price) * 100;
      map.set(stock.id, Number(change.toFixed(2)));
    });
    return map;
  }, [stocks, getStockPriceHistory]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      )}
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder ?? "Search characters or anime"}
        disabled={disabled}
        className="bg-background"
      />
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      <div className="max-h-[320px] overflow-y-auto rounded-2xl border border-border bg-card/50">
        {filteredStocks.length === 0 ? (
          <p className="px-4 py-5 text-sm text-muted-foreground">
            No stocks match your search.
          </p>
        ) : (
          filteredStocks.map((stock) => {
            const isSelected = stock.id === selectedStockId;
            const change = priceChanges.get(stock.id);
            return (
              <button
                key={stock.id}
                type="button"
                className={cn(
                  "w-full px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-primary/80",
                  isSelected
                    ? "border-l-4 border-primary bg-primary/5"
                    : "border-b border-border/60",
                  "flex flex-col gap-1"
                )}
                onClick={() => !disabled && onSelect(stock.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={stock.imageUrl || "/placeholder.svg"}
                      alt={stock.characterName}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {stock.characterName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stock.anime}
                    </p>
                  </div>
                  <div className="flex flex-col items-end text-xs font-semibold">
                    <span className="text-foreground">
                      {formatCurrencyCompact(stock.currentPrice)}
                    </span>
                    {typeof change === "number" && (
                      <span
                        className={cn(
                          change >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}
                      >
                        {change >= 0 ? "+" : ""}
                        {change}%
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
