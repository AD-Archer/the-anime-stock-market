"use client";

import React, { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function MarketTicker({
  limit = 12,
  duration = 22,
}: {
  limit?: number;
  duration?: number;
}) {
  const { stocks, getStockPriceHistory } = useStore();

  const top = useMemo(() => {
    return [...stocks]
      .sort(
        (a, b) =>
          b.currentPrice * b.totalShares - a.currentPrice * a.totalShares
      )
      .slice(0, limit);
  }, [stocks, limit]);

  // Render items twice to create a continuous track. Keys must be unique for duplicates.
  const itemsData = top.map((stock) => {
    const history = getStockPriceHistory(stock.id);
    const prevPrice =
      history.length >= 2
        ? history[history.length - 2].price
        : stock.currentPrice;
    const change = ((stock.currentPrice - prevPrice) / (prevPrice || 1)) * 100;
    return { stock, change };
  });

  const renderItems = (suffix = "") =>
    itemsData.map(({ stock, change }, idx) => (
      <Link
        key={`${stock.id}-${suffix || idx}`}
        href={`/character/${stock.characterSlug || stock.id}`}
        className="flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2"
      >
        <Badge className="p-1 sm:p-2 flex items-center gap-2 bg-primary/10 text-primary">
          <span className="font-mono text-foreground text-sm sm:text-base max-w-[8rem] sm:max-w-[12rem] truncate">
            {stock.characterName}
          </span>
          <span className="font-mono text-foreground text-sm sm:text-base">
            ${stock.currentPrice.toFixed(2)}
          </span>
          <span
            className={`font-mono text-sm sm:text-base ${
              change >= 0 ? "text-primary" : "text-destructive"
            }`}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </span>
        </Badge>
      </Link>
    ));

  return (
    <div className="relative overflow-hidden border rounded-md bg-card">
      <div
        className="ticker-track w-full"
        // Expose CSS duration via custom property so prefers-reduced-motion still works
        style={{ ["--duration" as any]: `${duration}s` }}
      >
        <div className="ticker-group">
          {renderItems()} {renderItems("dup")}
        </div>
      </div>

      <style jsx>{`
        .ticker-track {
          overflow: hidden;
          width: 100%;
        }
        .ticker-group {
          display: inline-flex;
          white-space: nowrap;
          will-change: transform;
          animation: marquee var(--duration) linear infinite;
        }

        .ticker-group > * {
          display: inline-flex;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ticker-group {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
