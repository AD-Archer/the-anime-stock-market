"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, DollarSign, BarChart3, AlertTriangle } from "lucide-react";

export function MarketManagement() {
  const {
    stocks,
    inflateMarket,
    getMarketData,
    massCreateShares,
    marketDriftEnabled,
    lastMarketDriftAt,
    setMarketDriftEnabled,
    applyDailyMarketDrift,
  } = useStore();
  const { toast } = useToast();
  const [inflationPercentage, setInflationPercentage] = useState("");
  const [shareCount, setShareCount] = useState("");
  const [dilutePrices, setDilutePrices] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRunningDrift, setIsRunningDrift] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);

  const marketData = getMarketData();
  const totalMarketCap = stocks.reduce(
    (sum, stock) =>
      sum + stock.currentPrice * (stock.totalShares - stock.availableShares),
    0
  );
  const averagePrice =
    stocks.length > 0
      ? stocks.reduce((sum, stock) => sum + stock.currentPrice, 0) /
        stocks.length
      : 0;

  const handleInflateMarket = () => {
    const percentage = Number.parseFloat(inflationPercentage);
    if (isNaN(percentage) || percentage === 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid percentage.",
        variant: "destructive",
      });
      return;
    }

    inflateMarket(percentage);
    toast({
      title: "Market Inflated",
      description: `All stock prices ${
        percentage > 0 ? "increased" : "decreased"
      } by ${Math.abs(percentage)}%`,
    });
    setInflationPercentage("");
  };

  const handleMassCreateShares = async () => {
    const count = Number.parseInt(shareCount);
    if (isNaN(count) || count <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid number of shares greater than 0.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress({
      current: 0,
      total: stocks.length,
      message: "Starting mass dilution...",
    });

    try {
      await massCreateShares(count, dilutePrices, (progress) => {
        setProgress(progress);
      });

      toast({
        title: "Shares Created Successfully",
        description: dilutePrices
          ? `Added ${count} shares to all ${stocks.length} stocks with price dilution.`
          : `Added ${count} shares to all ${stocks.length} stocks without price dilution.`,
      });
      setShareCount("");
    } catch (error) {
      console.error("Failed to mass create shares:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error Creating Shares",
        description: `Failed to create shares: ${errorMsg}. This may be due to rate limiting - try again in a few minutes.`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleToggleDrift = () => {
    const next = !marketDriftEnabled;
    setMarketDriftEnabled(next);
    toast({
      title: `Drift ${next ? "Enabled" : "Disabled"}`,
      description: next
        ? "Daily drift will resume on the next interval."
        : "Automatic daily drift has been paused.",
    });
  };

  const handleRunDriftNow = async () => {
    setIsRunningDrift(true);
    try {
      await applyDailyMarketDrift({ force: true });
      toast({
        title: "Drift Applied",
        description: "Applied immediate market drift to all stocks.",
      });
    } catch (error) {
      console.error("Failed to apply drift now:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error Applying Drift",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsRunningDrift(false);
    }
  };

  const formatLastDrift = () => {
    if (!lastMarketDriftAt) return "Never";
    try {
      return lastMarketDriftAt.toLocaleString();
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Market Management</h3>
        <p className="text-sm text-muted-foreground">
          Control market-wide operations and view market statistics
        </p>
      </div>

      {/* Market Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Market Cap
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalMarketCap.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Across all stocks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Stock Price
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averagePrice.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Mean price across stocks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Stocks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stocks.length}</div>
            <p className="text-xs text-muted-foreground">
              Total stocks available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Market Drift */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>Daily Drift</span>
            <span
              className={`text-sm font-medium ${
                marketDriftEnabled ? "text-green-600" : "text-destructive"
              }`}
            >
              {marketDriftEnabled ? "Enabled" : "Disabled"}
            </span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Small daily drift to simulate a gentle market index trend. Toggle or
            run it immediately for all stocks.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Last drift: {formatLastDrift()}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={marketDriftEnabled ? "secondary" : "default"}
              onClick={handleToggleDrift}
            >
              {marketDriftEnabled ? "Disable Drift" : "Enable Drift"}
            </Button>
            <Button onClick={handleRunDriftNow} disabled={isRunningDrift}>
              {isRunningDrift ? "Applying..." : "Run Drift Now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Market Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Market Inflation Control
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Adjust all stock prices by a percentage. Use positive values to
            inflate, negative to deflate.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="inflation">Percentage Change</Label>
              <Input
                id="inflation"
                type="number"
                step="0.1"
                value={inflationPercentage}
                onChange={(e) => setInflationPercentage(e.target.value)}
                placeholder="e.g., 10.5 for +10.5%, -5 for -5%"
              />
            </div>
            <Button onClick={handleInflateMarket} variant="destructive">
              <TrendingUp className="h-4 w-4 mr-2" />
              Apply Inflation
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Warning:</strong> This will affect all stock prices
              immediately and create new price history entries.
            </p>
            <p>
              Example: +10% will increase all stock prices by 10%, -5% will
              decrease them by 5%.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Share Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Share Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add shares to all stocks simultaneously. This will dilute all stock
            prices proportionally.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="shares">Shares to Add</Label>
              <Input
                id="shares"
                type="number"
                min="1"
                value={shareCount}
                onChange={(e) => setShareCount(e.target.value)}
                placeholder="e.g., 1000"
              />
            </div>
            <Button onClick={handleMassCreateShares} variant="default">
              <TrendingUp className="h-4 w-4 mr-2" />
              Add Shares
            </Button>
          </div>
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.message}</span>
                <span>
                  {progress.current}/{progress.total}
                </span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>
          )}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="dilute-prices"
              checked={dilutePrices}
              onChange={(e) => setDilutePrices(e.target.checked)}
              className="h-4 w-4"
            />
            <Label
              htmlFor="dilute-prices"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Dilute stock prices when adding shares
            </Label>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Note:</strong>{" "}
              {dilutePrices
                ? "Adding shares will dilute all stock prices to maintain market capitalization."
                : "Adding shares will not affect stock prices (increases total market capitalization)."}
            </p>
            {dilutePrices && (
              <p>
                Example: Adding 1000 shares to a stock with 1000 existing shares
                will reduce the price by ~50%.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Market Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <Button
              variant="outline"
              onClick={() => {
                setInflationPercentage("5");
                handleInflateMarket();
              }}
            >
              Inflate 5%
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setInflationPercentage("-5");
                handleInflateMarket();
              }}
            >
              Deflate 5%
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setInflationPercentage("10");
                handleInflateMarket();
              }}
            >
              Boom 10%
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setInflationPercentage("-10");
                handleInflateMarket();
              }}
            >
              Crash 10%
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
