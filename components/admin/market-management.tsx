"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, DollarSign, BarChart3, AlertTriangle } from "lucide-react";

export function MarketManagement() {
  const { stocks, inflateMarket, getMarketData } = useStore();
  const { toast } = useToast();
  const [inflationPercentage, setInflationPercentage] = useState("");

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
              +5% Inflation
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setInflationPercentage("-5");
                handleInflateMarket();
              }}
            >
              -5% Deflation
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setInflationPercentage("10");
                handleInflateMarket();
              }}
            >
              +10% Boom
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setInflationPercentage("-10");
                handleInflateMarket();
              }}
            >
              -10% Crash
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
