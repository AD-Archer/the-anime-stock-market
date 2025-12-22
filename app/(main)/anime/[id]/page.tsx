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
  ArrowLeft,
  MessageSquare,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function AnimeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    stocks,
    getStockPriceHistory,
    currentUser,
    addComment,
    getAnimeComments,
    users,
  } = useStore();
  const [comment, setComment] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const animeCharacters = stocks.filter(
    (stock) => stock.anime.toLowerCase().replace(/\s+/g, "-") === id
  );

  if (animeCharacters.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Anime not found</p>
      </div>
    );
  }

  const animeName = animeCharacters[0].anime;
  const comments = getAnimeComments(id);

  const totalMarketCap = animeCharacters.reduce(
    (sum, char) => sum + char.currentPrice * char.totalShares,
    0
  );
  const averagePrice =
    animeCharacters.reduce((sum, char) => sum + char.currentPrice, 0) /
    animeCharacters.length;

  const allDates = new Set<string>();
  const priceDataByStock = new Map<string, Map<string, number>>();

  animeCharacters.forEach((stock) => {
    const history = getStockPriceHistory(stock.id);
    const dateMap = new Map<string, number>();

    history.forEach((ph) => {
      const dateKey = ph.timestamp.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      allDates.add(dateKey);
      dateMap.set(dateKey, ph.price);
    });

    priceDataByStock.set(stock.id, dateMap);
  });

  const chartData = Array.from(allDates)
    .sort()
    .map((date) => {
      const dataPoint: any = { date };
      animeCharacters.forEach((stock) => {
        dataPoint[stock.characterName] =
          priceDataByStock.get(stock.id)?.get(date) || null;
      });
      return dataPoint;
    });

  const handleAddComment = () => {
    if (comment.trim()) {
      addComment(id, comment);
      setComment("");
    }
  };

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/anime">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Anime List
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="mb-4 text-4xl font-bold text-foreground">
            {animeName}
          </h1>
          <div className="flex gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Characters</p>
              <p className="text-2xl font-bold text-foreground">
                {animeCharacters.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Market Cap</p>
              <p className="text-2xl font-bold text-foreground">
                ${totalMarketCap.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Price</p>
              <p className="text-2xl font-bold text-foreground">
                ${averagePrice.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Character Price Comparison</CardTitle>
            <CardDescription>
              Compare all characters from {animeName}
            </CardDescription>
            <div className="flex flex-wrap gap-2 pt-2">
              {animeCharacters.map((stock, index) => (
                <Badge key={stock.id} variant="secondary" className="gap-2">
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
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
              <LineChart data={chartData}>
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
                <Legend
                  wrapperStyle={{ fontSize: isMobile ? "12px" : "14px" }}
                />
                {animeCharacters.map((stock, index) => (
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

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Characters</CardTitle>
                <CardDescription>
                  All tradeable characters from {animeName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {animeCharacters.map((stock) => {
                    const priceHistory = getStockPriceHistory(stock.id);
                    let priceChange = 0;
                    if (priceHistory.length >= 2) {
                      const previousPrice =
                        priceHistory[priceHistory.length - 2].price;
                      priceChange =
                        ((stock.currentPrice - previousPrice) / previousPrice) *
                        100;
                    }
                    const isPositive = priceChange > 0;
                    const isNegative = priceChange < 0;

                    return (
                      <Link key={stock.id} href={`/character/${stock.id}`}>
                        <Card className="transition-all hover:shadow-md">
                          <CardContent className="p-4">
                            <div className="mb-3 flex items-center gap-3">
                              <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                                <Image
                                  src={stock.imageUrl || "/placeholder.svg"}
                                  alt={stock.characterName}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-foreground">
                                  {stock.characterName}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {stock.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xl font-bold text-foreground">
                                  ${stock.currentPrice.toFixed(2)}
                                </p>
                                {priceHistory.length >= 2 && (
                                  <div className="flex items-center gap-1">
                                    {isPositive && (
                                      <TrendingUp className="h-3 w-3 text-chart-4" />
                                    )}
                                    {isNegative && (
                                      <TrendingDown className="h-3 w-3 text-destructive" />
                                    )}
                                    <span
                                      className={`text-xs font-medium ${
                                        isPositive
                                          ? "text-chart-4"
                                          : isNegative
                                          ? "text-destructive"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {isPositive && "+"}
                                      {priceChange.toFixed(2)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                              <Badge variant="secondary">
                                {stock.availableShares.toLocaleString()}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Discussion</CardTitle>
                <CardDescription>
                  Talk about {animeName} and its characters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="comments">
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="comments">
                      Comments ({comments.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="comments" className="space-y-4">
                    <div className="space-y-2">
                      <Textarea
                        placeholder={`Share your thoughts about ${animeName}...`}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                      />
                      <Button
                        onClick={handleAddComment}
                        disabled={!comment.trim()}
                        className="w-full"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Post Comment
                      </Button>
                    </div>

                    {comments.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">
                        No comments yet. Start the conversation!
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {comments.map((c) => {
                          const user = users.find((u) => u.id === c.userId);
                          return (
                            <div key={c.id} className="rounded-lg border p-3">
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
    </div>
  );
}
