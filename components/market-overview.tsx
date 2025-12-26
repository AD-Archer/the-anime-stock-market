"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MarketChart } from "@/components/market-chart";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { formatCurrencySmart, formatCompactNumber } from "@/lib/utils";

function useCurrentTimestamp(updateIntervalMs = 60000) {
  const [timestamp, setTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(
      () => setTimestamp(Date.now()),
      updateIntervalMs
    );
    return () => clearInterval(interval);
  }, [updateIntervalMs]);

  return timestamp;
}

export function MarketOverview() {
  const { stocks } = useStore();

  const latestStock = useMemo(() => {
    if (!stocks.length) return null;
    return [...stocks].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
  }, [stocks]);

  const now = useCurrentTimestamp();
  const isRecent =
    latestStock && now - latestStock.createdAt.getTime() <= 1000 * 60 * 60 * 24;

  return (
    <div className="space-y-6">
      {latestStock && isRecent && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">New IPO</p>
            <p className="text-lg font-bold text-foreground">
              {latestStock.characterName} ({latestStock.anime})
            </p>
            <p className="text-sm text-muted-foreground">
              Listing price {formatCurrencySmart(latestStock.currentPrice)} •{" "}
              {formatCompactNumber(latestStock.availableShares)} shares
              available
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/character/${latestStock.characterSlug || latestStock.id}`}
            >
              <Button>View IPO</Button>
            </Link>
          </div>
        </div>
      )}

      <MarketChart />
    </div>
  );
}
