"use client";

import { Button } from "@/components/ui/button";
import { TrendingUp, Zap, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { formatCompactNumber } from "@/lib/utils";

export function MarketHero() {
  const router = useRouter();
  const { stocks, transactions, users } = useStore();

  const totalVolume = transactions.length;
  const uniqueStocks = stocks.length;

  const handleGetStarted = () => {
    // Scroll to browse section
    const browseSection = document.getElementById("browse-stocks");
    if (browseSection) {
      browseSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative mb-12 overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-8 sm:p-12">
      {/* Decorative elements */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl"></div>
      <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl"></div>

      <div className="relative">
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary animate-pulse"></div>
            <p className="text-sm font-medium text-primary">
              Anime Stock Market
            </p>
          </div>
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
            Trade Your Favorite Anime Characters
          </h1>
        </div>

        <p className="mb-8 max-w-2xl text-lg text-muted-foreground">
          Buy and sell stocks of popular anime characters. Watch prices
          fluctuate based on community activity, rankings, and character
          popularity. Start trading today with virtual currency.
        </p>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border/50 bg-background/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                Active Stocks
              </p>
            </div>
            <p className="text-2xl font-bold">
              {formatCompactNumber(uniqueStocks)}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                Total Trades
              </p>
            </div>
            <p className="text-2xl font-bold">
              {formatCompactNumber(totalVolume)}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                Active Traders
              </p>
            </div>
            <p className="text-2xl font-bold">
              {formatCompactNumber(users.length)}
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button size="lg" onClick={handleGetStarted}>
            <Zap className="mr-2 h-5 w-5" />
            Start Trading
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push("/market?tab=guide")}
          >
            Learn How to Trade
          </Button>
        </div>
      </div>
    </div>
  );
}
