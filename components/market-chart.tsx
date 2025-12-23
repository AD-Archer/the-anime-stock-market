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
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  // Use site primary color (blue) instead of chart-4 pink
  "hsl(var(--primary))",
  "hsl(var(--chart-5))",
];

export function MarketChart() {
  const { stocks, getStockPriceHistory } = useStore();
  const [showByCharacter, setShowByCharacter] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get top 5 stocks by market cap
  const topStocks = [...stocks]
    .sort(
      (a, b) => b.currentPrice * b.totalShares - a.currentPrice * a.totalShares
    )
    .slice(0, 5);

  if (showByCharacter) {
    const allDates = new Set<string>();
    const priceDataByStock = new Map<string, Map<string, number>>();

    topStocks.forEach((stock) => {
      const history = getStockPriceHistory(stock.id);
      const dateMap = new Map<string, number>();

      history.forEach((ph) => {
        const dateKey = ph.timestamp.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        allDates.add(dateKey);
        dateMap.set(dateKey, ph.price * stock.totalShares); // Market cap
      });

      priceDataByStock.set(stock.id, dateMap);
    });

    const chartData = Array.from(allDates)
      .sort()
      .map((date) => {
        const dataPoint: any = { date };
        topStocks.forEach((stock) => {
          dataPoint[stock.characterName] =
            priceDataByStock.get(stock.id)?.get(date) || null;
        });
        return dataPoint;
      });

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Market Overview</CardTitle>
              <CardDescription>
                Top 5 characters by market capitalization
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {topStocks.map((stock, index) => (
              <Badge key={stock.id} variant="secondary" className="gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
                {stock.characterName}
              </Badge>
            ))}
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
              {topStocks.map((stock, index) => (
                <Line
                  key={stock.id}
                  type="monotone"
                  dataKey={stock.characterName}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={isMobile ? 1.5 : 2}
                  dot={false}
                  connectNulls
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
