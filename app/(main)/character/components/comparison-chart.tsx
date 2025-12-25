"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Search, X } from "lucide-react";
import Image from "next/image";

interface ComparisonChartProps {
  initialStockId?: string;
  timeRange?: "7d" | "30d" | "90d" | "all";
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ComparisonChart({
  initialStockId,
  timeRange = "all",
}: ComparisonChartProps) {
  const { stocks, getStockPriceHistory } = useStore();
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>(
    initialStockId ? [initialStockId] : []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Filter stocks based on search
  const filteredStocks = stocks.filter(
    (stock) =>
      (stock.characterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.anime.toLowerCase().includes(searchQuery.toLowerCase())) &&
      !selectedStockIds.includes(stock.id)
  );

  // Get price history for selected stocks
  const now = new Date();
  const daysAgo =
    timeRange === "7d"
      ? 7
      : timeRange === "30d"
      ? 30
      : timeRange === "90d"
      ? 90
      : 365;
  const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

  // Combine all price histories
  const allDates = new Set<string>();
  const priceDataByStock = new Map<string, Map<string, number>>();

  selectedStockIds.forEach((stockId) => {
    const history = getStockPriceHistory(stockId).filter((ph) =>
      timeRange === "all" ? true : ph.timestamp >= cutoffDate
    );
    const dateMap = new Map<string, number>();

    history.forEach((ph) => {
      const dateKey = ph.timestamp.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      allDates.add(dateKey);
      dateMap.set(dateKey, ph.price);
    });

    priceDataByStock.set(stockId, dateMap);
  });

  // Create chart data
  const chartData = Array.from(allDates)
    .sort()
    .map((date) => {
      const dataPoint: any = { date };
      selectedStockIds.forEach((stockId) => {
        const stock = stocks.find((s) => s.id === stockId);
        if (stock) {
          dataPoint[stock.characterName] =
            priceDataByStock.get(stockId)?.get(date) || null;
        }
      });
      return dataPoint;
    });

  const toggleStock = (stockId: string) => {
    if (selectedStockIds.includes(stockId)) {
      setSelectedStockIds(selectedStockIds.filter((id) => id !== stockId));
    } else if (selectedStockIds.length < 5) {
      setSelectedStockIds([...selectedStockIds, stockId]);
    }
  };

  const selectedStocks = selectedStockIds
    .map((id) => stocks.find((s) => s.id === id))
    .filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Price Comparison</CardTitle>
            <CardDescription>Compare up to 5 characters</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        {showSearch && (
          <div className="space-y-2">
            <Input
              placeholder="Search characters or anime..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            {searchQuery && (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-2">
                {filteredStocks.slice(0, 10).map((stock) => (
                  <button
                    key={stock.id}
                    onClick={() => {
                      toggleStock(stock.id);
                      setSearchQuery("");
                    }}
                    disabled={selectedStockIds.length >= 5}
                    className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <div className="relative h-10 w-10 overflow-hidden rounded">
                      <Image
                        src={stock.imageUrl || "/placeholder.svg"}
                        alt={stock.characterName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {stock.characterName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stock.anime}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      ${stock.currentPrice.toFixed(2)}
                    </p>
                  </button>
                ))}
                {filteredStocks.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No characters found
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selected Characters */}
        {selectedStocks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedStocks.map((stock, index) => (
              <Badge key={stock!.id} variant="secondary" className="gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
                {stock!.characterName}
                <button
                  onClick={() => toggleStock(stock!.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Chart */}
        {selectedStocks.length > 0 ? (
          <div className="text-muted-foreground">
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  stroke="currentColor"
                  tick={{ fill: "currentColor" }}
                  fontSize={isMobile ? 10 : 12}
                  interval={isMobile ? 3 : 0}
                />
                <YAxis
                  stroke="currentColor"
                  tick={{ fill: "currentColor" }}
                  fontSize={isMobile ? 10 : 12}
                  width={isMobile ? 40 : 60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: isMobile ? "12px" : "14px",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: isMobile ? "12px" : "14px" }}
                />
                {selectedStocks.map((stock, index) => (
                  <Line
                    key={stock!.id}
                    type="monotone"
                    dataKey={stock!.characterName}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={isMobile ? 1.5 : 2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            className={`flex items-center justify-center text-muted-foreground ${
              isMobile ? "h-[300px]" : "h-[400px]"
            }`}
          >
            <p>Select characters to compare their price history</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
