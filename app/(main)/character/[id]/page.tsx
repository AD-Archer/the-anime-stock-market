"use client";

import { use, useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { BuyDialog } from "@/app/(main)/character/components/buy-dialog";
import { ComparisonChart } from "@/app/(main)/character/components/comparison-chart";

type TimeRange = "all" | "7d" | "30d" | "90d";

export default function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    stocks,
    getStockPriceHistory,
    transactions,
    currentUser,
    addComment,
    getCharacterComments,
    users,
  } = useStore();
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [comment, setComment] = useState("");
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const stock = stocks.find((s) => s.id === id);
  if (!stock) {
    return (
      <div className="container mx-auto px-4 py-8">Character not found</div>
    );
  }

  const priceHistory = getStockPriceHistory(id);
  const characterTransactions = transactions
    .filter((t) => t.stockId === id)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const comments = getCharacterComments(id);

  // Filter price history by time range
  const now = new Date();
  const filteredPriceHistory = priceHistory.filter((ph) => {
    if (timeRange === "all") return true;
    const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return ph.timestamp >= cutoffDate;
  });

  const chartData = filteredPriceHistory.map((ph) => ({
    date: ph.timestamp.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    price: ph.price,
    marketCap: ph.price * stock.totalShares,
    volume: stock.totalShares - stock.availableShares,
  }));

  const priceChange =
    priceHistory.length > 1
      ? ((priceHistory[priceHistory.length - 1].price - priceHistory[0].price) /
          priceHistory[0].price) *
        100
      : 0;

  const handleAddComment = () => {
    if (comment.trim()) {
      const animeId = stock.anime.toLowerCase().replace(/\s+/g, "-");
      addComment(animeId, comment, id);
      setComment("");
    }
  };

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Market
          </Button>
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Character Info */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="relative mb-4 aspect-square overflow-hidden rounded-lg">
                <Image
                  src={stock.imageUrl || "/placeholder.svg"}
                  alt={stock.characterName}
                  fill
                  className="object-cover"
                />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                {stock.characterName}
              </h1>
              <p className="mb-4 text-muted-foreground">{stock.anime}</p>
              <p className="mb-6 text-sm text-muted-foreground">
                {stock.description}
              </p>

              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Current Price
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    ${stock.currentPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Price Change
                  </span>
                  <Badge
                    variant={priceChange >= 0 ? "default" : "destructive"}
                    className="gap-1"
                  >
                    {priceChange >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {priceChange.toFixed(2)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Available Shares
                  </span>
                  <span className="font-mono text-foreground">
                    {stock.availableShares.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Shares
                  </span>
                  <span className="font-mono text-foreground">
                    {stock.totalShares.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Market Cap
                  </span>
                  <span className="font-mono text-foreground">
                    ${(stock.currentPrice * stock.totalShares).toFixed(2)}
                  </span>
                </div>
              </div>

              <Button onClick={() => setShowBuyDialog(true)} className="w-full">
                Buy Shares
              </Button>
            </CardContent>
          </Card>

          {/* Price History & Activity */}
          <div className="space-y-6 lg:col-span-2">
            {/* Price Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Price History</CardTitle>
                    <CardDescription>
                      Track price changes over time
                    </CardDescription>
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
                <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorPrice"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
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
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="hsl(var(--primary))"
                      strokeWidth={isMobile ? 1.5 : 2}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Market Capitalization</CardTitle>
                <CardDescription>Total market value over time</CardDescription>
              </CardHeader>
              <CardContent>
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
                          stopColor="hsl(var(--chart-2))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--chart-2))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={isMobile ? 10 : 12}
                      interval={isMobile ? 3 : 0}
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
                    <Area
                      type="monotone"
                      dataKey="marketCap"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={isMobile ? 1.5 : 2}
                      fillOpacity={1}
                      fill="url(#colorMarketCap)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <ComparisonChart initialStockId={id} timeRange={timeRange} />

            {/* Activity & Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Activity & Discussion</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="transactions">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="transactions">
                      Recent Transactions
                    </TabsTrigger>
                    <TabsTrigger value="comments">
                      Comments ({comments.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="transactions" className="space-y-4">
                    {characterTransactions.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">
                        No transactions yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {characterTransactions.slice(0, 10).map((tx) => {
                          const user = users.find((u) => u.id === tx.userId);
                          return (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div>
                                <p className="font-medium text-foreground">
                                  {user?.username || "Unknown"}{" "}
                                  <Badge
                                    variant={
                                      tx.type === "buy"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {tx.type}
                                  </Badge>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {tx.shares} shares @ $
                                  {tx.pricePerShare.toFixed(2)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono font-semibold text-foreground">
                                  ${tx.totalAmount.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {tx.timestamp.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="comments" className="space-y-4">
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Share your thoughts about this character..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                      />
                      <Button
                        onClick={handleAddComment}
                        disabled={!comment.trim()}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Post Comment
                      </Button>
                    </div>

                    {comments.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">
                        No comments yet. Be the first!
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {comments.map((c) => {
                          const user = users.find((u) => u.id === c.userId);
                          return (
                            <div key={c.id} className="rounded-lg border p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="font-semibold text-foreground">
                                  {user?.username || "Unknown"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {c.timestamp.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {c.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showBuyDialog && (
        <BuyDialog stockId={id} onClose={() => setShowBuyDialog(false)} />
      )}
    </div>
  );
}
