"use client";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { Comment, ContentTag } from "@/lib/types";
import {
  generateAnimeSlug,
  generateCharacterSlug,
  generateOptionChain,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BuyDialog } from "@/app/(main)/character/components/buy-dialog";
import { SellDialog } from "@/components/sell-dialog";

import CharacterInfo from "./components/CharacterInfo";
import PriceCharts from "./components/PriceCharts";
import ActivityDiscussion from "./components/ActivityDiscussion";
import { OptionChainPanel } from "@/components/options/OptionChainPanel";
import { OptionStatsCard } from "@/components/options/OptionStatsCard";

type TimeRange = "all" | "7d" | "30d" | "90d";

export default function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    stocks,
    getStockPriceHistory,
    transactions,
    currentUser,
    addComment,
    editComment,
    deleteComment,
    getCharacterComments,
    users,
    reportComment,
    toggleCommentReaction,
    getUserPortfolio,
    schedulePriceHistoryLoad,
  } = useStore();
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [comment, setComment] = useState("");
  const [commentTag, setCommentTag] = useState<"none" | ContentTag>("none");
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Get initial tab from URL or default to "stocks"
  const activeTab =
    searchParams.get("tab") === "options" ? "options" : "stocks";

  const handleSetActiveTab = (value: string) => {
    const pathname =
      typeof window !== "undefined" ? window.location.pathname : "";
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (value === "stocks") {
      newSearchParams.delete("tab");
    } else {
      newSearchParams.set("tab", value);
    }
    const newUrl = newSearchParams.toString()
      ? `?${newSearchParams.toString()}`
      : pathname;
    router.replace(newUrl, { scroll: false });
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Try to find by characterSlug first (new format), then by ID (backward compatibility)
  // Normalize the incoming ID to handle any special characters consistently
  const normalizedId = generateCharacterSlug(id);
  const stock =
    stocks.find((s) => s.characterSlug === id) ||
    stocks.find(
      (s) => generateCharacterSlug(s.characterSlug) === normalizedId
    ) ||
    stocks.find(
      (s) => generateCharacterSlug(s.characterName) === normalizedId
    ) ||
    stocks.find((s) => s.id === id);
  const resolvedStockId = stock?.id;
  const characterIdentifiers = Array.from(
    new Set([stock?.id, id].filter(Boolean) as string[])
  );
  const commentCharacterId = resolvedStockId ?? id;
  const priceHistory = resolvedStockId
    ? getStockPriceHistory(resolvedStockId)
    : [];
  const characterTransactions = transactions
    .filter((t) => characterIdentifiers.includes(t.stockId))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const comments = Array.from(
    new Map(
      characterIdentifiers
        .flatMap((identifier) => getCharacterComments(identifier))
        .map((comment) => [comment.id, comment])
    ).values()
  );
  const userShares = currentUser
    ? getUserPortfolio(currentUser.id).find((p) =>
        characterIdentifiers.includes(p.stockId)
      )?.shares ?? 0
    : 0;
  const animeSlug = stock?.anime ? generateAnimeSlug(stock.anime) : "";

  useEffect(() => {
    if (!resolvedStockId) return;
    schedulePriceHistoryLoad([resolvedStockId], {
      minEntries: 30,
      limit: 200,
    });
  }, [resolvedStockId, schedulePriceHistoryLoad]);

  // Process comments into threaded structure
  const commentMap = new Map<string, Comment & { replies: Comment[] }>();
  const rootComments: (Comment & { replies: Comment[] })[] = [];

  // First pass: create comment objects with empty replies arrays
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: build the tree structure
  comments.forEach((comment) => {
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(commentMap.get(comment.id)!);
      }
    } else {
      rootComments.push(commentMap.get(comment.id)!);
    }
  });

  // Sort root comments by timestamp (newest first)
  rootComments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (!stock) {
    return (
      <div className="container mx-auto px-4 py-8">Character not found</div>
    );
  }

  // Filter price history by time range
  const now = new Date();
  const filteredPriceHistory = priceHistory
    .filter((ph) => {
      if (timeRange === "all") return true;
      const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const cutoffDate = new Date(
        now.getTime() - daysAgo * 24 * 60 * 60 * 1000
      );
      return ph.timestamp >= cutoffDate;
    })
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const hasIntraDayChanges = (() => {
    const seen = new Set<string>();
    for (const ph of filteredPriceHistory) {
      const dayKey = ph.timestamp.toISOString().split("T")[0];
      if (seen.has(dayKey)) return true;
      seen.add(dayKey);
    }
    return false;
  })();

  const formatHistoryLabel = (timestamp: Date) => {
    if (hasIntraDayChanges) {
      return timestamp.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return timestamp.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const chartData = filteredPriceHistory.map((ph) => ({
    date: formatHistoryLabel(ph.timestamp),
    price: ph.price,
    marketCap: ph.price * stock.totalShares,
    volume: stock.totalShares - stock.availableShares,
  }));

  // Compute price change based on the currently selected time range (filteredPriceHistory)
  const nonInitHistory = filteredPriceHistory.filter(
    (ph) => ph.price > 0 && !ph.id.startsWith("ph-init-")
  );
  const changeHistory =
    nonInitHistory.length >= 2 ? nonInitHistory : filteredPriceHistory;
  const latestEntry = changeHistory.at(-1);
  const previousEntry =
    changeHistory.length > 1 ? changeHistory.at(-2) : null;
  const priceChangePct =
    latestEntry && previousEntry && previousEntry.price > 0
      ? ((latestEntry.price - previousEntry.price) / previousEntry.price) * 100
      : 0;

  const handleAddComment = async () => {
    if (comment.trim()) {
      const tags = commentTag === "none" ? [] : ([commentTag] as ContentTag[]);
      await addComment({
        animeId: stock.anime.toLowerCase().replace(/\s+/g, "-"),
        content: comment,
        characterId: commentCharacterId,
        tags,
      });
      setComment("");
      setCommentTag("none");
    }
  };

  const handleAddReply = async (
    parentId: string,
    content: string,
    tags?: ContentTag[]
  ) => {
    if (content.trim()) {
      await addComment({
        animeId: stock.anime.toLowerCase().replace(/\s+/g, "-"),
        content,
        characterId: commentCharacterId,
        parentId,
        tags,
      });
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    if (content.trim()) {
      await editComment(commentId, content);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
  };

  const handleReportComment = async (
    commentId: string,
    reason: string,
    description?: string
  ) => {
    await reportComment(commentId, reason as any, description);
  };

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/market">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Market
          </Button>
        </Link>

        <Tabs
          value={activeTab}
          onValueChange={handleSetActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="stocks">Stocks</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
          </TabsList>

          <TabsContent value="stocks">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Price History & Activity */}
              <div className="space-y-6 lg:col-span-3">
                {/* Mobile: Discussion Section First */}
                {isMobile && (
                  <ActivityDiscussion
                    isMobile={isMobile}
                    rootComments={rootComments}
                    comment={comment}
                    setComment={setComment}
                    commentTag={commentTag}
                    setCommentTag={setCommentTag}
                    onAddComment={handleAddComment}
                    onAddReply={handleAddReply}
                    onEditComment={handleEditComment}
                    onDeleteComment={handleDeleteComment}
                    onReportComment={handleReportComment}
                    onToggleReaction={toggleCommentReaction}
                    users={users}
                    characterTransactions={characterTransactions}
                    currentUser={currentUser}
                    commentMap={commentMap}
                  />
                )}
              </div>

              {/* Character Info */}
              <CharacterInfo
                stock={stock}
                animeSlug={animeSlug}
                currentUser={currentUser}
                userShares={userShares}
                priceChangePct={priceChangePct}
                onBuy={() => setShowBuyDialog(true)}
                onSell={() => setShowSellDialog(true)}
              />

              {/* Charts Section */}
              <div className="space-y-6 lg:col-span-2">
                <PriceCharts
                  chartData={chartData}
                  isMobile={isMobile}
                  timeRange={timeRange}
                  setTimeRange={setTimeRange}
                  stock={stock}
                  initialStockId={resolvedStockId}
                />

                {/* Desktop: Activity & Comments Section */}
                {!isMobile && (
                  <ActivityDiscussion
                    isMobile={isMobile}
                    rootComments={rootComments}
                    comment={comment}
                    setComment={setComment}
                    commentTag={commentTag}
                    setCommentTag={setCommentTag}
                    onAddComment={handleAddComment}
                    onAddReply={handleAddReply}
                    onEditComment={handleEditComment}
                    onDeleteComment={handleDeleteComment}
                    onReportComment={handleReportComment}
                    onToggleReaction={toggleCommentReaction}
                    users={users}
                    characterTransactions={characterTransactions}
                    currentUser={currentUser}
                    commentMap={commentMap}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="options">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-3">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="space-y-4 lg:col-span-1">
                    <OptionStatsCard
                      stock={stock}
                      expiryDays={30}
                      subtitle={`Trade ${stock.characterName} options on ${stock.anime}.`}
                      className="h-full"
                    />
                  </div>
                  <div className="lg:col-span-2 space-y-4">
                    <div className="rounded-2xl border border-border bg-card p-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground">
                          Option highlights
                        </h3>
                        <span className="text-xs uppercase text-muted-foreground">
                          IV &amp; Greeks
                        </span>
                      </div>
                      <div className="mt-6">
                        <OptionChainPanel
                          options={generateOptionChain(stock, 30)}
                          maxEntries={3}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() =>
                          resolvedStockId &&
                          router.push(`/options?stock=${resolvedStockId}`)
                        }
                        className="w-full sm:w-auto"
                      >
                        View Options Chain
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {showBuyDialog && resolvedStockId && (
        <BuyDialog
          stockId={resolvedStockId}
          onClose={() => setShowBuyDialog(false)}
        />
      )}
      {showSellDialog && resolvedStockId && (
        <SellDialog
          stockId={resolvedStockId}
          maxShares={userShares}
          onClose={() => setShowSellDialog(false)}
        />
      )}
    </div>
  );
}
