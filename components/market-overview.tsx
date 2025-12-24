"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MarketChart } from "@/components/market-chart";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export function MarketOverview() {
  const { stocks } = useStore();

  const latestStock = useMemo(() => {
    if (!stocks.length) return null;
    return [...stocks].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
  }, [stocks]);

  const isRecent = latestStock
    ? Date.now() - latestStock.createdAt.getTime() <= 1000 * 60 * 60 * 24
    : false;

  return (
    <div className="space-y-4">
      {latestStock && isRecent && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">New IPO</p>
            <p className="text-lg font-bold text-foreground">
              {latestStock.characterName} ({latestStock.anime})
            </p>
            <p className="text-sm text-muted-foreground">
              Listing price ${latestStock.currentPrice.toFixed(2)} •{" "}
              {latestStock.availableShares.toLocaleString()} shares available
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/character/${latestStock.id}`}>
              <Button>View IPO</Button>
            </Link>
          </div>
        </div>
      )}

      <MarketChart />
    </div>
  );
}
