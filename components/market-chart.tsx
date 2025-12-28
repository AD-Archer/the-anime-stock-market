"use client";

import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { TrendingUp, RefreshCw } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrencyCompact } from "@/lib/utils";

const CustomTooltip = ({ active, payload, label, config }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-2 font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any) => {
          const key = entry.dataKey ?? "";
          const labelText = config[key]?.label ?? String(key);
          const color = config[key]?.color ?? entry.color ?? "currentColor";
          return (
            <div key={String(key)} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground">{labelText}</span>
              <span className="ml-auto text-foreground">
                {formatCurrencyCompact(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--destructive)",
  "var(--accent)",
  "var(--secondary)",
  "oklch(0.82 0.16 70)", // Warm yellow
  "oklch(0.74 0.2 305)", // Vibrant purple
];

type TimePeriod = "day" | "week" | "biweekly" | "month" | "year";
type StockFilter = "most_active" | "most_expensive" | "market_cap";

interface MarketChartProps {}

export function MarketChart({}: MarketChartProps = {}) {
  const { stocks, transactions, getStockPriceHistory, refreshPriceHistory } =
    useStore();
  const [showByCharacter, setShowByCharacter] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("biweekly");
  const [filter, setFilter] = useState<StockFilter>("most_active");
  const [hiddenCharacters, setHiddenCharacters] = useState<Set<string>>(
    new Set()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPriceHistory();
    } catch (error) {
      console.error("Failed to refresh price history:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get top 10 stocks by selected filter
  const stockActivity = useMemo(() => {
    const activity = new Map<string, number>();
    transactions.forEach((transaction) => {
      const currentCount = activity.get(transaction.stockId) || 0;
      activity.set(transaction.stockId, currentCount + 1);
    });
    return activity;
  }, [transactions]);

  const topStocks = useMemo(() => {
    let result: any[] = [];
    switch (filter) {
      case "most_active":
        result = [...stocks]
          .filter((stock) => (stockActivity.get(stock.id) || 0) > 0)
          .sort((a, b) => {
            const aActivity = stockActivity.get(a.id) || 0;
            const bActivity = stockActivity.get(b.id) || 0;
            return bActivity - aActivity;
          })
          .slice(0, 10);
        break;
      case "most_expensive":
        result = [...stocks]
          .sort((a, b) => b.currentPrice - a.currentPrice)
          .slice(0, 10);
        break;
      case "market_cap":
        result = [...stocks]
          .sort(
            (a, b) =>
              b.currentPrice * b.totalShares - a.currentPrice * a.totalShares
          )
          .slice(0, 10);
        break;
    }

    // Fallback: if most_active has less than 10, add from others
    if (filter === "most_active" && result.length < 10) {
      const activeIds = new Set(result.map((s) => s.id));
      const inactiveStocks = [...stocks]
        .filter((stock) => !activeIds.has(stock.id))
        .sort(
          (a, b) =>
            b.currentPrice * b.totalShares - a.currentPrice * a.totalShares
        );
      result = [...result, ...inactiveStocks].slice(0, 10);
    }

    return result;
  }, [stocks, filter, stockActivity]);

  const chartConfig = useMemo<ChartConfig>(() => {
    const entries = topStocks.map((stock, index) => [
      stock.id,
      {
        label: stock.characterName,
        color: CHART_COLORS[index % CHART_COLORS.length],
      },
    ]);
    return Object.fromEntries(entries);
  }, [topStocks]);

  if (topStocks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Overview</CardTitle>
          <CardDescription>
            Top 10 characters by trading activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No trading activity available yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter price history based on selected time period
  const getFilteredHistory = (history: any[]) => {
    if (!history || history.length === 0) return [];

    const now = new Date();
    const cutoff = new Date();

    switch (timePeriod) {
      case "day":
        cutoff.setHours(now.getHours() - 24);
        break;
      case "week":
        cutoff.setDate(now.getDate() - 7);
        break;
      case "biweekly":
        cutoff.setDate(now.getDate() - 14);
        break;
      case "month":
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case "year":
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filtered = history.filter(
      (entry) => new Date(entry.timestamp) >= cutoff
    );

    // If no data in the selected period, show all available data
    return filtered.length > 0 ? filtered : history;
  };

  if (showByCharacter) {
    // Filter out hidden characters
    const visibleStocks = topStocks.filter(
      (stock) => !hiddenCharacters.has(stock.id)
    );

    const allDates = new Set<string>();
    const priceDataByStock = new Map<string, Map<string, number>>();

    visibleStocks.forEach((stock) => {
      const fullHistory = getStockPriceHistory(stock.id);
      const filteredHistory = getFilteredHistory(fullHistory);
      const dateMap = new Map<string, number>();

      // Fill in missing dates with the last known value
      let lastValue: number | null = null;
      filteredHistory.forEach((ph) => {
        let dateKey: string;
        const date = new Date(ph.timestamp);

        switch (timePeriod) {
          case "day":
            dateKey = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
            });
            break;
          case "week":
            dateKey = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            break;
          case "biweekly":
            dateKey = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            break;
          case "month":
            dateKey = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            break;
          case "year":
            dateKey = date.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            });
            break;
          default:
            dateKey = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
        }

        lastValue = ph.price * stock.totalShares; // Market cap
        dateMap.set(dateKey, lastValue);
        allDates.add(dateKey);
      });

      // If no historical data, add current market cap as a data point
      if (filteredHistory.length === 0) {
        const currentDate = new Date();
        let currentDateKey: string;
        switch (timePeriod) {
          case "day":
            currentDateKey = currentDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
            });
            break;
          case "week":
            currentDateKey = currentDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            break;
          case "biweekly":
            currentDateKey = currentDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            break;
          case "month":
            currentDateKey = currentDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            break;
          case "year":
            currentDateKey = currentDate.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            });
            break;
          default:
            currentDateKey = currentDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
        }
        const currentMarketCap = stock.currentPrice * stock.totalShares;
        dateMap.set(currentDateKey, currentMarketCap);
        allDates.add(currentDateKey);
      }

      priceDataByStock.set(stock.id, dateMap);
    });

    const sortedDates = Array.from(allDates).sort((a, b) => {
      if (timePeriod === "day") {
        return new Date(a).getTime() - new Date(b).getTime();
      }
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const lastValues = new Map<string, number | null>();
    visibleStocks.forEach((stock) => lastValues.set(stock.id, null));

    const chartData = sortedDates
      .map((date) => {
        const dataPoint: any = { date };
        visibleStocks.forEach((stock) => {
          const value = priceDataByStock.get(stock.id)?.get(date);
          const lastValue = lastValues.get(stock.id) ?? null;
          const nextValue = value ?? lastValue;
          dataPoint[stock.id] = nextValue;
          if (value !== undefined) {
            lastValues.set(stock.id, value);
          }
        });
        return dataPoint;
      })
      .filter((point) =>
        visibleStocks.some((stock) => point[stock.id] !== null)
      );

    if (chartData.length === 0) {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Market Overview</CardTitle>
                <CardDescription>
                  Top 10 characters by trading activity
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select
                  value={filter}
                  onValueChange={(value: StockFilter) => setFilter(value)}
                >
                  <SelectTrigger className="w-[140px]" suppressHydrationWarning>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="most_active">Most Active</SelectItem>
                    <SelectItem value="most_expensive">
                      Most Expensive
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={timePeriod}
                  onValueChange={(value: TimePeriod) => setTimePeriod(value)}
                >
                  <SelectTrigger className="w-[120px]" suppressHydrationWarning>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Last Day</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="biweekly">Last 2 Weeks</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {topStocks.map((stock, index) => (
                <Badge
                  key={stock.id}
                  variant="outline"
                  className="gap-2"
                  style={{
                    borderColor: CHART_COLORS[index % CHART_COLORS.length],
                    color: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  {stock.characterName}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <p>No trading activity available for the selected time period</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Market Overview</CardTitle>
              <CardDescription>
                Top 10 characters by trading activity
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select
                value={filter}
                onValueChange={(value: StockFilter) => setFilter(value)}
              >
                <SelectTrigger className="w-[140px]" suppressHydrationWarning>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="most_active">Most Active</SelectItem>
                  <SelectItem value="most_expensive">Most Expensive</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={timePeriod}
                onValueChange={(value: TimePeriod) => setTimePeriod(value)}
              >
                <SelectTrigger className="w-[120px]" suppressHydrationWarning>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Last Day</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="biweekly">Last 2 Weeks</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {topStocks.map((stock, index) => {
              const isHidden = hiddenCharacters.has(stock.id);
              return (
                <Badge
                  key={stock.id}
                  variant={isHidden ? "secondary" : "default"}
                  className={`gap-2 cursor-pointer transition-opacity border ${
                    isHidden ? "text-muted-foreground bg-muted opacity-50" : ""
                  }`}
                  onClick={() => {
                    const newHidden = new Set(hiddenCharacters);
                    if (isHidden) {
                      newHidden.delete(stock.id);
                    } else {
                      newHidden.add(stock.id);
                    }
                    setHiddenCharacters(newHidden);
                  }}
                  style={
                    isHidden
                      ? undefined
                      : {
                          borderColor:
                            CHART_COLORS[index % CHART_COLORS.length],
                          backgroundColor: "transparent",
                          color: CHART_COLORS[index % CHART_COLORS.length],
                        }
                  }
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: isHidden
                        ? "var(--muted-foreground)"
                        : CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  {stock.characterName}
                </Badge>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className="text-muted-foreground"
          >
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <LineChart
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={isMobile ? 10 : 12}
                  interval={isMobile ? 2 : 0}
                  tick={{ fill: "currentColor" }}
                />
                <YAxis
                  stroke="currentColor"
                  tick={{ fill: "currentColor" }}
                  fontSize={isMobile ? 10 : 12}
                  width={isMobile ? 40 : 60}
                  tickFormatter={(value) => formatCurrencyCompact(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<CustomTooltip config={chartConfig} />}
                />
                {visibleStocks.map((stock) => (
                  <Line
                    key={`${stock.id}-${timePeriod}-${hiddenCharacters.size}`}
                    type="monotone"
                    dataKey={stock.id}
                    stroke={chartConfig[stock.id]?.color ?? "var(--foreground)"}
                    strokeWidth={isMobile ? 2 : 3}
                    dot={false}
                    connectNulls
                    activeDot={{
                      r: 5,
                      stroke:
                        chartConfig[stock.id]?.color ?? "var(--foreground)",
                      strokeWidth: 2,
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-start gap-2 text-sm">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 font-medium leading-none">
                Top 10 trading activity trends{" "}
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 leading-none text-muted-foreground">
                Tap a character to hide or show their line
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    );
  }

  // If not showing by character, explicitly return null to avoid returning undefined
  return null;
}
