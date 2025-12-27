"use client";

import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComparisonChart } from "@/app/(main)/character/components/comparison-chart";
import { formatCurrencyCompact } from "@/lib/utils";

type TimeRange = "all" | "7d" | "30d" | "90d";

interface Props {
  chartData: any[];
  isMobile: boolean;
  timeRange: TimeRange;
  setTimeRange: (t: TimeRange) => void;
  stock: any;
  initialStockId?: string;
}

export default function PriceCharts({
  chartData,
  isMobile,
  timeRange,
  setTimeRange,
  stock,
  initialStockId,
}: Props) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Price History</CardTitle>
              <CardDescription>Track price changes over time</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={timeRange === "7d" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("7d")}
              >
                7D
              </Button>
              <Button
                variant={timeRange === "30d" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("30d")}
              >
                30D
              </Button>
              <Button
                variant={timeRange === "90d" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("90d")}
              >
                90D
              </Button>
              <Button
                variant={timeRange === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("all")}
              >
                All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--primary)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  stroke="currentColor"
                  fontSize={isMobile ? 10 : 12}
                  interval={isMobile ? 2 : 0}
                />
                <YAxis
                  stroke="currentColor"
                  fontSize={isMobile ? 10 : 12}
                  width={isMobile ? 40 : 60}
                  tickFormatter={(value) => formatCurrencyCompact(value)}
                />
                <ChartTooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: isMobile ? "12px" : "14px",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                  formatter={(value: any, name?: string) => [
                    formatCurrencyCompact(Number(value)),
                    name === "price" ? "Price" : name ?? "Value",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="var(--primary)"
                  strokeWidth={isMobile ? 1.5 : 2}
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market Capitalization</CardTitle>
          <CardDescription>Total market value over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="colorMarketCap"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--chart-2)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--chart-2)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
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
                  tickFormatter={(value) => formatCurrencyCompact(value)}
                />
                <ChartTooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: isMobile ? "12px" : "14px",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                  formatter={(value: any, name?: string) => [
                    formatCurrencyCompact(Number(value)),
                    name === "marketCap" ? "Market Cap" : name ?? "Value",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="marketCap"
                  stroke="var(--chart-2)"
                  strokeWidth={isMobile ? 1.5 : 2}
                  fillOpacity={1}
                  fill="url(#colorMarketCap)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {initialStockId && (
        <ComparisonChart
          initialStockId={initialStockId}
          timeRange={timeRange}
        />
      )}
    </>
  );
}
