"use client";

import { cn } from "@/lib/utils";
import type { OptionChainEntry } from "@/lib/utils";
import type { Stock } from "@/lib/types";
import { OptionChainPanel } from "@/components/options/OptionChainPanel";

type OptionChainSectionProps = {
  selectedStock?: Stock;
  optionChain: OptionChainEntry[];
  className?: string;
};

export function OptionChainSection({
  selectedStock,
  optionChain,
  className,
}: OptionChainSectionProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card p-4 sm:p-6",
        className
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Option chain
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            {selectedStock?.characterName ?? "Select a stock"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {selectedStock
              ? `${selectedStock.anime} - IV & Greeks`
              : "Pick a stock to load chains"}
          </p>
        </div>
        <span className="text-xs uppercase text-muted-foreground">
          Live IV &amp; Greeks
        </span>
      </div>
      {selectedStock ? (
        <div className="mt-4 sm:mt-6 space-y-4">
          <OptionChainPanel options={optionChain} />
        </div>
      ) : (
        <div className="mt-4 sm:mt-6 rounded-2xl border border-dashed border-border/40 p-4 sm:p-6 text-sm text-muted-foreground">
          Pick a stock to view option chains.
        </div>
      )}
    </article>
  );
}
