"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  formatCompactNumber,
  formatCurrency,
  formatCurrencySmart,
  generateOptionChain,
} from "@/lib/utils";
import { useStore } from "@/lib/store";
import { OptionBetSection } from "@/components/options/OptionBetSection";
import { OptionChainSection } from "@/components/options/OptionChainSection";
import { HotStrikesSection } from "@/components/options/HotStrikesSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Crown } from "lucide-react";
import type { DirectionalBet } from "@/lib/types";

export default function CallsAndPutsPage() {
  const router = useRouter();
  const {
    stocks,
    directionalBets,
    users,
    transactions,
    currentUser,
    placeDirectionalBet,
    getStockPriceHistory,
  } = useStore();
  const [selectedStockId, setSelectedStockId] = useState<string | undefined>(
    undefined
  );
  const [direction, setDirection] = useState<DirectionalBet["type"]>("call");
  const [amountInput, setAmountInput] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExpiryDays, setSelectedExpiryDays] = useState(30);
  const [customExpiryInput, setCustomExpiryInput] = useState("30");
  const [expiryConfirmedAt, setExpiryConfirmedAt] = useState<Date | null>(null);
  const [expiryWarning, setExpiryWarning] = useState("");
  const [activeTab, setActiveTab] = useState("place-bet");
  const expiryOptions = [7, 14, 30, 60];

  useEffect(() => {
    if (!selectedStockId && stocks.length > 0) {
      setSelectedStockId(stocks[0].id);
    }
  }, [selectedStockId, stocks]);

  useEffect(() => {
    setExpiryConfirmedAt(null);
    setExpiryWarning("");
    setCustomExpiryInput(String(selectedExpiryDays));
  }, [selectedExpiryDays]);

  const userBalance = currentUser?.balance ?? 0;

  const aggregated = useMemo(() => {
    const now = new Date();
    const openBets = directionalBets.filter(
      (bet) => bet.status === "open" && bet.expiresAt > now
    );
    const summaryMap = new Map<
      string,
      {
        callVolume: number;
        putVolume: number;
        callCount: number;
        putCount: number;
      }
    >();

    openBets.forEach((bet) => {
      const entry = summaryMap.get(bet.stockId) ?? {
        callVolume: 0,
        putVolume: 0,
        callCount: 0,
        putCount: 0,
      };

      if (bet.type === "call") {
        entry.callVolume += bet.amount;
        entry.callCount += 1;
      } else {
        entry.putVolume += bet.amount;
        entry.putCount += 1;
      }

      summaryMap.set(bet.stockId, entry);
    });

    const stockSummaries = stocks
      .map((stock) => {
        const entry = summaryMap.get(stock.id) ?? {
          callVolume: 0,
          putVolume: 0,
          callCount: 0,
          putCount: 0,
        };
        const totalVolume = entry.callVolume + entry.putVolume;
        return {
          stock,
          ...entry,
          totalVolume,
        };
      })
      .filter((summary) => summary.totalVolume > 0)
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 5);

    return {
      stockSummaries,
      callVolume: openBets
        .filter((bet) => bet.type === "call")
        .reduce((total, bet) => total + bet.amount, 0),
      putVolume: openBets
        .filter((bet) => bet.type === "put")
        .reduce((total, bet) => total + bet.amount, 0),
      callCount: openBets.filter((bet) => bet.type === "call").length,
      putCount: openBets.filter((bet) => bet.type === "put").length,
      openBetsCount: openBets.length,
    };
  }, [directionalBets, stocks]);

  const stockMap = useMemo(
    () => new Map(stocks.map((stock) => [stock.id, stock])),
    [stocks]
  );

  const userMap = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users]
  );

  const selectedStock = selectedStockId
    ? stockMap.get(selectedStockId)
    : undefined;

  const optionChain = useMemo(
    () =>
      selectedStock
        ? generateOptionChain(selectedStock, selectedExpiryDays)
        : [],
    [selectedStock, selectedExpiryDays]
  );

  const formatGreekValue = (value: number, digits = 2) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;

  const recentCalls = useMemo(() => {
    const now = new Date();
    return directionalBets
      .filter(
        (bet) =>
          bet.type === "call" && bet.status === "open" && bet.expiresAt > now
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
  }, [directionalBets]);

  const recentPuts = useMemo(() => {
    const now = new Date();
    return directionalBets
      .filter(
        (bet) =>
          bet.type === "put" && bet.status === "open" && bet.expiresAt > now
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
  }, [directionalBets]);

  const applyCustomExpiry = () => {
    const parsed = Number(customExpiryInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setExpiryWarning("Enter a valid expiry in days.");
      return;
    }

    setExpiryWarning("");
    setSelectedExpiryDays(Math.min(Math.max(1, Math.round(parsed)), 365));
  };

  const handlePlaceBet = async () => {
    if (!selectedStockId) return;
    if (!currentUser) {
      router.push("/auth/signin");
      return;
    }

    const parsedAmount = Number(amountInput.trim());
    const betAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
    if (betAmount <= 0 || betAmount > userBalance) return;
    if (!expiryConfirmedAt) {
      setExpiryWarning("Please confirm the expiry before placing a bet.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await placeDirectionalBet(
        selectedStockId,
        direction,
        betAmount,
        selectedExpiryDays
      );
      if (success) {
        setAmountInput("");
        setExpiryConfirmedAt(null);
        setExpiryWarning("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const amountValue =
    Number.isFinite(Number(amountInput.trim())) && amountInput.trim() !== ""
      ? Number(amountInput.trim())
      : 0;

  const nextCallShare =
    aggregated.callVolume + aggregated.putVolume > 0
      ? Math.round(
          (aggregated.callVolume /
            (aggregated.callVolume + aggregated.putVolume || 1)) *
            100
        )
      : 0;
  const nextPutShare = 100 - nextCallShare;

  return (
    <div className="bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 overflow-visible">
        {/* Header Section */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Live options
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Calls &amp; Puts
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Wager on whether characters will rally or roll over.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                <p className="text-xs uppercase text-muted-foreground">
                  Balance
                </p>
                <p className="text-lg sm:text-xl font-bold text-foreground mt-1">
                  {formatCurrency(userBalance)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                <p className="text-xs uppercase text-muted-foreground">
                  Active bets
                </p>
                <p className="text-lg sm:text-xl font-bold text-foreground mt-1">
                  {formatCompactNumber(aggregated.openBetsCount)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                <p className="text-xs uppercase text-muted-foreground">
                  Call vol
                </p>
                <p className="text-lg sm:text-xl font-bold text-emerald-500 mt-1">
                  {formatCurrencySmart(aggregated.callVolume)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCompactNumber(aggregated.callCount)} calls
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                <p className="text-xs uppercase text-muted-foreground">
                  Put vol
                </p>
                <p className="text-lg sm:text-xl font-bold text-rose-500 mt-1">
                  {formatCurrencySmart(aggregated.putVolume)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCompactNumber(aggregated.putCount)} puts
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section Selector Dropdown */}
        <div className="lg:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="place-bet">Place Bet</SelectItem>
              <SelectItem value="chain">Option Chain</SelectItem>
              <SelectItem value="hot-strikes">Hot Strikes</SelectItem>
              <SelectItem value="activity">Activity Feed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile: Conditional Content Rendering */}
        <div className="lg:hidden">
          {activeTab === "place-bet" && (
            <OptionBetSection
              stocks={stocks}
              selectedStockId={selectedStockId}
              onSelectStock={setSelectedStockId}
              getStockPriceHistory={getStockPriceHistory}
              transactions={transactions}
              selectedStock={selectedStock}
              selectedExpiryDays={selectedExpiryDays}
              expiryOptions={expiryOptions}
              customExpiryInput={customExpiryInput}
              onCustomExpiryInput={setCustomExpiryInput}
              onApplyCustomExpiry={applyCustomExpiry}
              expiryConfirmedAt={expiryConfirmedAt}
              expiryWarning={expiryWarning}
              onConfirmExpiry={() => {
                setExpiryConfirmedAt(new Date());
                setExpiryWarning("");
              }}
              onSelectExpiryDays={setSelectedExpiryDays}
              direction={direction}
              onDirectionChange={setDirection}
              amountInput={amountInput}
              onAmountChange={setAmountInput}
              onMaxAmount={() => setAmountInput(String(userBalance))}
              onPlaceBet={handlePlaceBet}
              isSubmitting={isSubmitting}
              amountValue={amountValue}
              userBalance={userBalance}
              currentUser={currentUser}
            />
          )}
          {activeTab === "chain" && (
            <OptionChainSection
              selectedStock={selectedStock}
              optionChain={optionChain}
            />
          )}
          {activeTab === "hot-strikes" && (
            <HotStrikesSection summaries={aggregated.stockSummaries} />
          )}
          {activeTab === "activity" && (
            <div className="space-y-4">
              <ActivitySection
                title="Live calls"
                bets={recentCalls}
                userMap={userMap}
                stockMap={stockMap}
                color="emerald"
              />
              <ActivitySection
                title="Live puts"
                bets={recentPuts}
                userMap={userMap}
                stockMap={stockMap}
                color="rose"
              />
            </div>
          )}
        </div>

        {/* Desktop: Show all sections */}
        <div className="hidden lg:flex flex-col gap-6">
          <OptionBetSection
            stocks={stocks}
            selectedStockId={selectedStockId}
            onSelectStock={setSelectedStockId}
            getStockPriceHistory={getStockPriceHistory}
            transactions={transactions}
            selectedStock={selectedStock}
            selectedExpiryDays={selectedExpiryDays}
            expiryOptions={expiryOptions}
            customExpiryInput={customExpiryInput}
            onCustomExpiryInput={setCustomExpiryInput}
            onApplyCustomExpiry={applyCustomExpiry}
            expiryConfirmedAt={expiryConfirmedAt}
            expiryWarning={expiryWarning}
            onConfirmExpiry={() => {
              setExpiryConfirmedAt(new Date());
              setExpiryWarning("");
            }}
            onSelectExpiryDays={setSelectedExpiryDays}
            direction={direction}
            onDirectionChange={setDirection}
            amountInput={amountInput}
            onAmountChange={setAmountInput}
            onMaxAmount={() => setAmountInput(String(userBalance))}
            onPlaceBet={handlePlaceBet}
            isSubmitting={isSubmitting}
            amountValue={amountValue}
            userBalance={userBalance}
            currentUser={currentUser}
          />

          <OptionChainSection
            selectedStock={selectedStock}
            optionChain={optionChain}
          />

          <HotStrikesSection summaries={aggregated.stockSummaries} />
        </div>

        {/* Desktop: Activity sections at bottom */}
        <div className="hidden lg:grid grid-cols-2 gap-6">
          <ActivitySection
            title="Live calls"
            bets={recentCalls}
            userMap={userMap}
            stockMap={stockMap}
            color="emerald"
          />
          <ActivitySection
            title="Live puts"
            bets={recentPuts}
            userMap={userMap}
            stockMap={stockMap}
            color="rose"
          />
        </div>
      </div>
    </div>
  );
}

// Helper component for activity sections (calls/puts)
function ActivitySection({
  title,
  bets,
  userMap,
  stockMap,
  color,
}: {
  title: string;
  bets: DirectionalBet[];
  userMap: Map<string, any>;
  stockMap: Map<string, any>;
  color: "emerald" | "rose";
}) {
  const colorClass = color === "emerald" ? "text-emerald-500" : "text-rose-500";

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground">
            Open {title.toLowerCase().includes("calls") ? "call" : "put"} bets
          </p>
        </div>
        <span className="text-xs uppercase text-muted-foreground">
          {formatCompactNumber(bets.length)} shown
        </span>
      </div>
      <div className="space-y-2">
        {bets.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No {title.toLowerCase()} have been placed yet.
          </p>
        )}
        {bets.map((bet) => {
          const user = userMap.get(bet.userId);
          const stock = stockMap.get(bet.stockId);
          return (
            <div
              key={bet.id}
              className="rounded-xl border border-border/60 bg-muted/50 p-3 text-sm transition hover:bg-muted/70"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground line-clamp-1">
                    {user?.displayName || "Anonymous"}
                  </p>
                  {user?.premiumMeta?.isPremium && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Crown className="h-4 w-4 text-purple-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Premium User</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <span
                  className={`text-xs font-semibold whitespace-nowrap ${colorClass}`}
                >
                  {formatCurrencySmart(bet.amount)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {stock?.characterName ?? bet.stockId} •{" "}
                {stock?.anime ?? "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Entry {formatCurrencySmart(bet.entryPrice)} •{" "}
                {formatDistanceToNowStrict(bet.expiresAt, {
                  addSuffix: true,
                })}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
