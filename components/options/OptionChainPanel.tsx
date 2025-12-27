"use client";

import { cn, formatCurrencySmart } from "@/lib/utils";
import type { OptionChainEntry } from "@/lib/utils";

type OptionChainPanelProps = {
  options: OptionChainEntry[];
  maxEntries?: number;
  className?: string;
};

const formatGreekValue = (value: number, digits = 2) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;

export function OptionChainPanel({
  options,
  maxEntries,
  className,
}: OptionChainPanelProps) {
  const visibleOptions =
    typeof maxEntries === "number" ? options.slice(0, maxEntries) : options;

  if (!visibleOptions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/40 p-6 text-sm text-muted-foreground">
        No option data available.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {visibleOptions.map((option) => (
        <div
          key={`${option.type}-${option.strike}`}
          className="rounded-2xl border border-border/60 bg-muted/40 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                {option.type === "call" ? "Call" : "Put"} · {option.expiryDays}d
                expiry
              </p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrencySmart(option.strike)}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                option.type === "call"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-rose-500/10 text-rose-500"
              }`}
            >
              {option.iv.toFixed(1)}% IV
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <p>Delta</p>
              <p className="text-foreground">
                {formatGreekValue(option.delta, 2)}
              </p>
            </div>
            <div>
              <p>Gamma</p>
              <p className="text-foreground">
                {formatGreekValue(option.gamma, 3)}
              </p>
            </div>
            <div>
              <p>Theta</p>
              <p className="text-foreground">
                {formatGreekValue(option.theta, 3)}
              </p>
            </div>
            <div>
              <p>Vega</p>
              <p className="text-foreground">
                {formatGreekValue(option.vega, 3)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
