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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(45 100% 50%)", // Yellow
  "hsl(280 100% 70%)", // Purple
];

type TimePeriod = "day" | "week" | "month" | "year";

export function MarketChart() {
  const { stocks, getStockPriceHistory } = useStore();
  const [showByCharacter, setShowByCharacter] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");
  const [hiddenCharacters, setHiddenCharacters] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get top 10 stocks by market cap
  const topStocks = [...stocks]
    .sort(
      (a, b) => b.currentPrice * b.totalShares - a.currentPrice * a.totalShares
    )
    .slice(0, 10);

  if (topStocks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Overview</CardTitle>
          <CardDescription>
            Top 10 characters by market capitalization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No market data available yet</p>
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
      case "month":
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case "year":
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filtered = history.filter(entry => new Date(entry.timestamp) >= cutoff);

    // If no data in the selected period, show all available data
    return filtered.length > 0 ? filtered : history;
  };

  if (showByCharacter) {
    // Filter out hidden characters
    const visibleStocks = topStocks.filter(stock => !hiddenCharacters.has(stock.id));

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

      priceDataByStock.set(stock.id, dateMap);
    });

    const chartData = Array.from(allDates)
      .sort((a, b) => {
        // For day view, sort by time, otherwise by date
        if (timePeriod === "day") {
          return new Date(a).getTime() - new Date(b).getTime();
        }
        return new Date(a).getTime() - new Date(b).getTime();
      })
      .map((date) => {
        const dataPoint: any = { date };
        visibleStocks.forEach((stock) => {
          dataPoint[stock.characterName] =
            priceDataByStock.get(stock.id)?.get(date) || null;
        });
        return dataPoint;
      })
      .filter(point => {
        // Only include points where at least one stock has data
        return visibleStocks.some(stock => point[stock.characterName] !== null);
      });

    if (chartData.length === 0) {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Market Overview</CardTitle>
                <CardDescription>
                  Top 10 characters by market capitalization
                </CardDescription>
              </div>
              <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Last Day</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {topStocks.map((stock, index) => (
                <Badge key={stock.id} variant="default" className="gap-2 text-primary-foreground bg-primary">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: "hsl(var(--primary-foreground))",
                    }}
                  />
                  {stock.characterName}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <p>No price history data available for the selected time period</p>
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
                Top 10 characters by market capitalization
              </CardDescription>
            </div>
            <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Last Day</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {topStocks.map((stock, index) => {
              const isHidden = hiddenCharacters.has(stock.id);
              return (
                <Badge
                  key={stock.id}
                  variant={isHidden ? "secondary" : "default"}
                  className={`gap-2 cursor-pointer transition-opacity ${
                    isHidden ? "text-muted-foreground bg-muted opacity-50" : "text-primary-foreground bg-primary"
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
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: isHidden ? "hsl(var(--muted-foreground))" : CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  {stock.characterName}
                </Badge>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={isMobile ? 10 : 12}
                interval={isMobile ? 2 : 0}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={isMobile ? 10 : 12}
                width={isMobile ? 40 : 60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: isMobile ? "12px" : "14px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: isMobile ? "12px" : "14px",
                }}
              />
              {visibleStocks.map((stock, index) => (
                <Line
                  key={`${stock.id}-${timePeriod}-${hiddenCharacters.size}`}
                  type="monotone"
                  dataKey={stock.characterName}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={isMobile ? 2 : 3}
                  dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], strokeWidth: 2, r: 4 }}
                  connectNulls={true}
                  activeDot={{ r: 6, stroke: CHART_COLORS[index % CHART_COLORS.length], strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  // If not showing by character, explicitly return null to avoid returning undefined
  return null;
}
