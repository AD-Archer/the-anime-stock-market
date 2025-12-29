"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type TickerItem = {
  id: string;
  characterName: string;
  characterSlug?: string;
  currentPrice: number;
  change: number;
};

export function MarketTicker({
  limit = 20,
  duration = 22,
}: {
  limit?: number;
  duration?: number;
}) {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const loadTicker = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/stocks/ticker?limit=${encodeURIComponent(String(limit))}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error(`Ticker request failed: ${response.status}`);
        }
        const data = (await response.json()) as TickerItem[];
        if (!isActive) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (error) {
        if (isActive) {
          setItems([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadTicker();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [limit]);

  const itemsData = useMemo(() => items.slice(0, limit), [items, limit]);

  const renderItems = (suffix = "") =>
    itemsData.map((stock, idx) => {
      const safeChange = Number.isFinite(stock.change) ? stock.change : 0;
      return (
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
              {formatCurrency(stock.currentPrice)}
            </span>
            <span
              className={`font-mono text-sm sm:text-base ${
                safeChange >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {safeChange >= 0 ? "+" : ""}
              {safeChange.toFixed(2)}%
            </span>
          </Badge>
        </Link>
      );
    });

  if (isLoading && itemsData.length === 0) {
    return (
      <div className="relative overflow-hidden border rounded-md bg-card h-full">
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Loading market ticker...
        </div>
      </div>
    );
  }

  if (!itemsData.length) {
    return (
      <div className="relative overflow-hidden border rounded-md bg-card h-full">
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Market data unavailable.
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden border rounded-md bg-card h-full">
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
