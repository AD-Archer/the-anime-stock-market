"use client";

import { cn, formatCompactNumber, formatCurrencySmart } from "@/lib/utils";
import type { Stock } from "@/lib/types";

export type HotStrikeSummary = {
  stock: Stock;
  callVolume: number;
  putVolume: number;
  callCount: number;
  putCount: number;
};

type HotStrikesSectionProps = {
  summaries: HotStrikeSummary[];
  className?: string;
};

export function HotStrikesSection({
  summaries,
  className,
}: HotStrikesSectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-4 sm:p-6",
        className
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Hot strikes
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            Most wagered stocks
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Top call vs put wagers.
          </p>
        </div>
        <span className="text-xs uppercase text-muted-foreground">Live</span>
      </div>
      <div className="mt-4 sm:mt-5 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        {summaries.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No bets yet. Be the first!
          </p>
        )}
        {summaries.map((summary) => {
          const total = summary.callVolume + summary.putVolume;
          const callPercent =
            total > 0 ? Math.round((summary.callVolume / total) * 100) : 0;
          const putPercent = 100 - callPercent;

          return (
            <div
              key={summary.stock.id}
              className="rounded-xl border border-border/60 bg-muted/40 p-3 sm:p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-foreground line-clamp-1">
                    {summary.stock.characterName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.stock.anime}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="text-foreground font-semibold">
                    {formatCurrencySmart(total)}
                  </p>
                  <p>
                    {formatCompactNumber(summary.callCount + summary.putCount)}{" "}
                    wagers
                  </p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-border mb-2">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${callPercent}%` }}
                />
              </div>
              <div className="flex gap-2 text-xs">
                <span className="text-emerald-500 font-semibold">
                  {callPercent}% calls
                </span>
                <span className="text-rose-500 font-semibold">
                  {putPercent}% puts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
