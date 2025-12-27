"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import { StockSelector } from "@/components/stock-selector";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  DirectionalBet,
  PriceHistory,
  Stock,
  Transaction,
  User,
} from "@/lib/types";
import { OptionStatsCard } from "@/components/options/OptionStatsCard";

type OptionBetSectionProps = {
  stocks: Stock[];
  selectedStockId?: string;
  onSelectStock: (stockId: string) => void;
  getStockPriceHistory: (stockId: string) => PriceHistory[];
  transactions?: Transaction[];
  selectedStock?: Stock;
  selectedExpiryDays: number;
  expiryOptions: number[];
  customExpiryInput: string;
  onCustomExpiryInput: (value: string) => void;
  onApplyCustomExpiry: () => void;
  expiryConfirmedAt: Date | null;
  expiryWarning: string;
  onConfirmExpiry: () => void;
  onSelectExpiryDays: (days: number) => void;
  direction: DirectionalBet["type"];
  onDirectionChange: (value: DirectionalBet["type"]) => void;
  amountInput: string;
  onAmountChange: (value: string) => void;
  onMaxAmount: () => void;
  onPlaceBet: () => void;
  isSubmitting: boolean;
  amountValue: number;
  userBalance: number;
  currentUser: User | null;
  className?: string;
};

const DIRECTION_LABELS: Record<DirectionalBet["type"], string> = {
  call: "Call",
  put: "Put",
};

export function OptionBetSection({
  stocks,
  selectedStockId,
  onSelectStock,
  getStockPriceHistory,
  transactions,
  selectedStock,
  selectedExpiryDays,
  expiryOptions,
  customExpiryInput,
  onCustomExpiryInput,
  onApplyCustomExpiry,
  expiryConfirmedAt,
  expiryWarning,
  onConfirmExpiry,
  onSelectExpiryDays,
  direction,
  onDirectionChange,
  amountInput,
  onAmountChange,
  onMaxAmount,
  onPlaceBet,
  isSubmitting,
  amountValue,
  userBalance,
  currentUser,
  className,
}: OptionBetSectionProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Place a bet
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              Pick your direction
            </h2>
          </div>
          <span className="text-xs uppercase text-muted-foreground">
            {selectedExpiryDays}d expiry
          </span>
        </div>

        {selectedStock ? (
          <OptionStatsCard
            stock={selectedStock}
            expiryDays={selectedExpiryDays}
            subtitle="Tap confirm to lock the window before placing your wager."
            className="bg-muted/80"
          />
        ) : (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
            Select a stock to preview odds and the option chain.
          </div>
        )}

        <StockSelector
          stocks={stocks}
          selectedStockId={selectedStockId}
          onSelect={onSelectStock}
          getStockPriceHistory={getStockPriceHistory}
          transactions={transactions}
          label="Choose stock"
          helperText="Sorted by recent activity so you can pick the most wagered characters."
        />

        <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Expiry window
          </p>
          <div className="flex flex-wrap gap-2">
            {expiryOptions.map((days) => (
              <button
                key={days}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition",
                  selectedExpiryDays === days
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background/80 text-muted-foreground"
                )}
                onClick={() => onSelectExpiryDays(days)}
              >
                {days} {days === 1 ? "day" : "days"}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="number"
              min={1}
              max={365}
              value={customExpiryInput}
              onChange={(event) => onCustomExpiryInput(event.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Custom expiry (days)"
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onApplyCustomExpiry}
              className="whitespace-nowrap"
            >
              Use custom expiry
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={onConfirmExpiry}>
              Confirm {selectedExpiryDays}-day expiry
            </Button>
            {expiryConfirmedAt ? (
              <p className="text-xs text-emerald-500">
                Confirmed{" "}
                {formatDistanceToNowStrict(expiryConfirmedAt, {
                  addSuffix: true,
                })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Select an expiry and confirm to lock it in.
              </p>
            )}
          </div>
          {expiryWarning && (
            <p className="text-xs text-rose-400">{expiryWarning}</p>
          )}
        </div>

        <div className="flex gap-2">
          {(["call", "put"] as DirectionalBet["type"][]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onDirectionChange(type)}
              className={cn(
                "flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition",
                direction === type
                  ? type === "call"
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-500"
                    : "border-rose-400 bg-rose-500/10 text-rose-500"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {DIRECTION_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-muted-foreground">
            Wager amount
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step="0.5"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => onAmountChange(event.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="5.00"
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onMaxAmount}
              className="whitespace-nowrap"
            >
              Max
            </Button>
          </div>
          {amountValue > userBalance && (
            <p className="text-xs text-rose-400">
              You only have {formatCurrency(userBalance)} available.
            </p>
          )}
        </div>

        <Button
          className="mt-4 w-full"
          disabled={
            !selectedStockId ||
            !currentUser ||
            amountValue <= 0 ||
            amountValue > userBalance ||
            isSubmitting
          }
          onClick={onPlaceBet}
        >
          {isSubmitting ? "Placing bet..." : "Place bet"}
        </Button>

        {!currentUser && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Sign in to unlock live calling and putting.
          </p>
        )}
      </div>
    </article>
  );
}
