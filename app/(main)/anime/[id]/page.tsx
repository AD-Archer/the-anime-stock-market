"use client";

import { use, useState, useEffect, useMemo, useRef } from "react";
import { useStore } from "@/lib/store";
import { User, Comment, ContentTag } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Flag,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ReportModal } from "@/components/report-modal";
import { ContentModeration } from "@/components/content-moderation";
import { MessageContent } from "@/components/chat/message-content";
import { Input } from "@/components/ui/input";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { getUserProfileHref } from "@/lib/user-profile";
import { generateAnimeSlug } from "@/lib/utils";
import { SellDialog } from "@/components/sell-dialog";
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
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Maximum series to show on the anime chart by default
const MAX_CHART_SERIES = 10;

interface CommentThreadProps {
  comment: Comment;
  commentMap: Map<string, Comment & { replies: Comment[] }>;
  users: User[];
  currentUser: User | null;
  onReply: (
    parentId: string,
    content: string,
    tags?: ContentTag[]
  ) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReport: (
    commentId: string,
    reason: string,
    description?: string
  ) => Promise<void>;
  onToggleReaction: (
    commentId: string,
    reaction: "like" | "dislike"
  ) => Promise<void>;
  level: number;
}

function CommentThread({
  comment,
  commentMap,
  users,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onToggleReaction,
  level,
}: CommentThreadProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [replyTag, setReplyTag] = useState<"none" | ContentTag>("none");

  const user = users.find((u) => u.id === comment.userId);
  const canEdit =
    currentUser && (currentUser.id === comment.userId || currentUser.isAdmin);
  const canDelete =
    currentUser && (currentUser.id === comment.userId || currentUser.isAdmin);

  const commentWithReplies = commentMap.get(comment.id);
  const replies = commentWithReplies ? commentWithReplies.replies : [];

  const sortedReplies = replies.sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  const likeCount = comment.likedBy?.length ?? 0;
  const dislikeCount = comment.dislikedBy?.length ?? 0;
  const userReaction = currentUser
    ? comment.likedBy?.includes(currentUser.id)
      ? "like"
      : comment.dislikedBy?.includes(currentUser.id)
      ? "dislike"
      : null
    : null;

  const handleReply = async () => {
    if (replyContent.trim()) {
      const tags = replyTag === "none" ? [] : ([replyTag] as ContentTag[]);
      await onReply(comment.id, replyContent, tags);
      setReplyContent("");
      setReplyTag("none");
      setIsReplying(false);
    }
  };

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== comment.content) {
      await onEdit(comment.id, editContent);
      setIsEditing(false);
    }
  };

  const handleReaction = async (reaction: "like" | "dislike") => {
    if (!currentUser) return;
    await onToggleReaction(comment.id, reaction);
  };

  const handleDelete = async () => {
    await onDelete(comment.id);
    setShowDeleteDialog(false);
  };

  const renderCommentContent = (content: string) => {
    const commentTags = comment.tags ?? [];
    const prefersNsfw = currentUser?.showNsfw ?? true;
    const prefersSpoilers = currentUser?.showSpoilers ?? true;

    if (commentTags.length > 0) {
      const primaryTag = commentTags.includes("nsfw") ? "nsfw" : "spoiler";
      const shouldHide =
        (commentTags.includes("nsfw") && !prefersNsfw) ||
        (commentTags.includes("spoiler") && !prefersSpoilers);

      return (
        <ContentModeration
          type={primaryTag}
          reason={
            commentTags.length > 1
              ? commentTags.map((tag) => tag.toUpperCase()).join(" & ")
              : undefined
          }
          defaultHidden={shouldHide}
        >
          <MessageContent content={content} className="text-muted-foreground" />
        </ContentModeration>
      );
    }

    // Backwards compatibility for bbcode-style tags
    const nsfwRegex = /\[nsfw(?:\s+(.+?))?\]([\s\S]*?)\[\/nsfw\]/i;
    const spoilerRegex = /\[spoiler(?:\s+(.+?))?\]([\s\S]*?)\[\/spoiler\]/i;

    const nsfwMatch = content.match(nsfwRegex);
    if (nsfwMatch) {
      const reason = nsfwMatch[1]?.trim();
      const nsfwContent = nsfwMatch[2];
      return (
        <ContentModeration
          type="nsfw"
          reason={reason}
          defaultHidden={!prefersNsfw}
        >
          <MessageContent
            content={nsfwContent}
            className="text-muted-foreground"
          />
        </ContentModeration>
      );
    }

    const spoilerMatch = content.match(spoilerRegex);
    if (spoilerMatch) {
      const reason = spoilerMatch[1]?.trim();
      const spoilerContent = spoilerMatch[2];
      return (
        <ContentModeration
          type="spoiler"
          reason={reason}
          defaultHidden={!prefersSpoilers}
        >
          <MessageContent
            content={spoilerContent}
            className="text-muted-foreground"
          />
        </ContentModeration>
      );
    }

    return (
      <MessageContent content={content} className="text-muted-foreground" />
    );
  };

  return (
    <div className={`${level > 0 ? "ml-6 border-l-2 border-muted pl-4" : ""}`}>
      <div className="rounded-lg border p-3 bg-card">
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={getUserProfileHref(user, comment.userId)}
                className="font-semibold text-foreground hover:underline"
              >
                {user?.username || "Unknown"}
              </Link>
              {user?.isAdmin && (
                <Badge variant="secondary" className="text-xs">
                  Admin
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-6 px-2 text-xs"
                >
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-wrap">
              {(comment.tags ?? []).map((tag) => (
                <Badge
                  key={`${comment.id}-${tag}`}
                  variant={tag === "nsfw" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {tag.toUpperCase()}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {comment.timestamp.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEdit}>
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          renderCommentContent(comment.content)
        )}

        <div className="mt-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs ${
              userReaction === "like" ? "text-chart-4" : "text-muted-foreground"
            }`}
            disabled={!currentUser}
            onClick={() => handleReaction("like")}
          >
            <ThumbsUp className="mr-1 h-4 w-4" />
            {likeCount}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs ${
              userReaction === "dislike"
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
            disabled={!currentUser}
            onClick={() => handleReaction("dislike")}
          >
            <ThumbsDown className="mr-1 h-4 w-4" />
            {dislikeCount}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsReplying(!isReplying)}
              className="h-6 px-2 text-xs"
            >
              Reply
            </Button>
          )}
          {currentUser && currentUser.id !== comment.userId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReportModal(true)}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <Flag className="h-3 w-3 mr-1" />
              Report
            </Button>
          )}
          {replies.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplies(!showReplies)}
              className="h-6 px-2 text-xs"
            >
              {showReplies ? "Hide" : "Show"} {replies.length}{" "}
              {replies.length === 1 ? "reply" : "replies"}
            </Button>
          )}
        </div>

        {isReplying && (
          <div className="mt-2 space-y-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <Select
              value={replyTag}
              onValueChange={(value) =>
                setReplyTag(value as "none" | ContentTag)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Add a tag (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Tag</SelectItem>
                <SelectItem value="spoiler">Spoiler</SelectItem>
                <SelectItem value="nsfw">NSFW</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleReply}>
                Reply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsReplying(false);
                  setReplyContent("");
                  setReplyTag("none");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Comment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={async (reason, description) => {
          await onReport(comment.id, reason, description);
        }}
        title="Report Comment"
      />

      {showReplies && sortedReplies.length > 0 && (
        <div className="mt-2 space-y-2">
          {sortedReplies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              commentMap={commentMap}
              users={users}
              currentUser={currentUser}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReport={onReport}
              onToggleReaction={onToggleReaction}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnimeDetailPage({
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
    editComment,
    deleteComment,
    getAnimeComments,
    users,
    reportComment,
    toggleCommentReaction,
    getUserPortfolio,
  } = useStore();
  const [comment, setComment] = useState("");
  const [commentTag, setCommentTag] = useState<"none" | ContentTag>("none");
  const [isMobile, setIsMobile] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [selectedStockForSell, setSelectedStockForSell] = useState<
    string | null
  >(null);
  const [charactersLimit, setCharactersLimit] = useState(12);

  const animeComments = getAnimeComments(id);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const animeCharacters = stocks.filter((stock) => {
    return generateAnimeSlug(stock.anime) === generateAnimeSlug(id);
  });

  const characterTransactions = transactions
    .filter((t) => t.stockId && animeCharacters.some((c) => c.id === t.stockId))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const userPortfolio = currentUser ? getUserPortfolio(currentUser.id) : [];

  // Toast helper
  const { toast } = useToast();

  // Selected characters to show on the chart (default to top 10 by market cap)
  const [selectedChartStocks, setSelectedChartStocks] = useState<Set<string>>(
    new Set()
  );

  const _initForAnime = useRef<string | null>(null);

  useEffect(() => {
    if (_initForAnime.current === id) return;

    const topIds = [...animeCharacters]
      .sort(
        (a, b) =>
          b.currentPrice * b.totalShares - a.currentPrice * a.totalShares
      )
      .slice(0, MAX_CHART_SERIES)
      .map((s) => s.id);

    // Avoid synchronous setState inside effect to prevent cascading renders
    const tid = setTimeout(() => {
      setSelectedChartStocks(new Set(topIds));
      _initForAnime.current = id;
    }, 0);

    return () => clearTimeout(tid);
  }, [animeCharacters, id]);

  // Server-backed search for characters on this anime page
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  useEffect(() => {
    const tid = setTimeout(async () => {
      const q = searchQuery.trim();
      if (!q) {
        setSearchResults(null);
        return;
      }
      try {
        const res = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(
            q
          )}&anime=${encodeURIComponent(id)}&limit=200`
        );
        if (!res.ok) {
          setSearchResults([]);
          return;
        }
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error("Search error", err);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(tid);
  }, [searchQuery, id]);

  const displayCharacters =
    searchResults && searchResults.length > 0
      ? searchResults
      : animeCharacters.slice(0, charactersLimit);

  const toggleChartStock = (stockId: string) => {
    // If removing, do it immediately
    if (selectedChartStocks.has(stockId)) {
      setSelectedChartStocks((prev) => {
        const next = new Set(prev);
        next.delete(stockId);
        return next;
      });
      return;
    }

    // If adding and at limit, show a confirmation toast that will replace the weakest series
    if (selectedChartStocks.size >= MAX_CHART_SERIES) {
      // Determine candidate to remove (lowest market cap in the selected set)
      const selectedArray = animeCharacters.filter((s) =>
        selectedChartStocks.has(s.id)
      );
      const candidate = selectedArray.reduce<{
        id: string;
        name: string;
        mcap: number;
      } | null>((small, s) => {
        const mcap = s.currentPrice * s.totalShares;
        if (!small || mcap < small.mcap)
          return { id: s.id, name: s.characterName, mcap };
        return small;
      }, null);

      const stockToAdd = animeCharacters.find((s) => s.id === stockId);
      const candidateName = candidate?.name ?? "a character";
      const addName = stockToAdd?.characterName ?? "this character";

      // Show confirm toast asynchronously to avoid setState-in-render errors
      setTimeout(() => {
        const t = toast({
          title: `This will remove ${candidateName}`,
          description: `Add ${addName} to the chart instead?`,
          action: (
            <ToastAction
              altText={`Replace ${addName}`}
              onClick={() => {
                setSelectedChartStocks((prev) => {
                  const next = new Set(prev);
                  if (candidate) next.delete(candidate.id);
                  next.add(stockId);
                  return next;
                });
                t.dismiss();
              }}
            >
              Replace
            </ToastAction>
          ),
        });
      }, 0);

      return;
    }

    // Otherwise add normally
    setSelectedChartStocks((prev) => {
      const next = new Set(prev);
      next.add(stockId);
      return next;
    });
  };
  const animeName = animeCharacters.length > 0 ? animeCharacters[0].anime : "";
  const animeCoverImage =
    animeCharacters.find((char) => char.animeImageUrl)?.animeImageUrl ||
    animeCharacters.find((char) => char.imageUrl)?.imageUrl ||
    "/placeholder.svg";
  const comments = getAnimeComments(id);

  // Process comments into threaded structure
  const { commentMap, rootComments } = useMemo(() => {
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

    return { commentMap, rootComments };
  }, [comments]);

  if (animeCharacters.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Anime not found</p>
      </div>
    );
  }

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

  // Only include selected characters in the chart data
  const selectedStocks = animeCharacters
    .filter((s) => selectedChartStocks.has(s.id))
    .sort(
      (a, b) => b.currentPrice * b.totalShares - a.currentPrice * a.totalShares
    );

  const chartData = Array.from(allDates)
    .sort()
    .map((date) => {
      const dataPoint: any = { date };
      selectedStocks.forEach((stock) => {
        dataPoint[stock.characterName] =
          priceDataByStock.get(stock.id)?.get(date) || null;
      });
      return dataPoint;
    });

  const handleAddComment = async () => {
    if (comment.trim()) {
      const tags = commentTag === "none" ? [] : ([commentTag] as ContentTag[]);
      await addComment({
        animeId: id,
        content: comment,
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
        animeId: id,
        content,
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
        <Link href="/anime">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Anime List
          </Button>
        </Link>

        <div className="mb-8 grid gap-6 lg:grid-cols-[260px,1fr]">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border bg-muted">
            <Image
              src={animeCoverImage}
              alt={`${animeName || "Anime"} cover art`}
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="mb-4 text-4xl font-bold text-foreground">
              {animeName}
            </h1>
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Characters
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {animeCharacters.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Market Cap
                </p>
                <p className="text-xl font-bold text-foreground break-all md:text-2xl">
                  ${totalMarketCap.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Price</p>
                <p className="text-xl font-bold text-foreground break-all md:text-2xl">
                  ${averagePrice.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Character Price Comparison</CardTitle>
                <CardDescription>
                  Compare characters from {animeName} (default: top{" "}
                  {MAX_CHART_SERIES} by market cap). Use Add to Graph on a card
                  to include a character.
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {(() => {
                const selected = animeCharacters
                  .filter((s) => selectedChartStocks.has(s.id))
                  .sort(
                    (a, b) =>
                      b.currentPrice * b.totalShares -
                      a.currentPrice * a.totalShares
                  );
                if (selected.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground">
                      No characters selected for the chart
                    </p>
                  );
                }
                return selected.map((stock, index) => (
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
                ));
              })()}
            </div>
          </CardHeader>
          <CardContent>
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
            </div>
          </CardContent>
        </Card>

        {/* Activity & Comments */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Activity & Discussion</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="comments">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="comments">
                  Comments ({rootComments.length})
                </TabsTrigger>
                <TabsTrigger value="animeTransactions">
                  Recent Transactions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="comments" className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Share your thoughts about this anime..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                  <Select
                    value={commentTag}
                    onValueChange={(value) =>
                      setCommentTag(value as "none" | ContentTag)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add a tag (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Tag</SelectItem>
                      <SelectItem value="spoiler">Spoiler</SelectItem>
                      <SelectItem value="nsfw">NSFW</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddComment} disabled={!comment.trim()}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Post Comment
                  </Button>
                </div>

                {rootComments.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    No comments yet. Be the first!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      let lastDate = "";
                      return rootComments.map((thread) => {
                        const dateLabel = thread.timestamp.toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        );
                        const showDate = dateLabel !== lastDate;
                        lastDate = dateLabel;
                        return (
                          <div key={thread.id} className="space-y-2">
                            {showDate && (
                              <div className="flex justify-center">
                                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                  {dateLabel}
                                </span>
                              </div>
                            )}
                            <CommentThread
                              comment={thread}
                              commentMap={commentMap}
                              users={users}
                              currentUser={currentUser}
                              onReply={handleAddReply}
                              onEdit={handleEditComment}
                              onDelete={handleDeleteComment}
                              onReport={handleReportComment}
                              onToggleReaction={toggleCommentReaction}
                              level={0}
                            />
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="animeTransactions" className="space-y-4">
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
                            {user ? (
                              <Link
                                href={getUserProfileHref(user, user.id)}
                                className="flex items-center gap-2 hover:underline"
                              >
                                <div className="relative h-8 w-8 overflow-hidden rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                                  {user.avatarUrl ? (
                                    <Image
                                      src={user.avatarUrl}
                                      alt={user.username || "User avatar"}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    (user.username || "?")
                                      .charAt(0)
                                      .toUpperCase()
                                  )}
                                </div>
                                <p className="font-medium text-foreground truncate">
                                  {user.username}
                                </p>
                                <Badge
                                  variant={
                                    tx.type === "buy" ? "default" : "secondary"
                                  }
                                  className="ml-2"
                                >
                                  {tx.type}
                                </Badge>
                              </Link>
                            ) : (
                              <p className="font-medium text-foreground">
                                Unknown
                                <Badge
                                  variant={
                                    tx.type === "buy" ? "default" : "secondary"
                                  }
                                  className="ml-2"
                                >
                                  {tx.type}
                                </Badge>
                              </p>
                            )}
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
            </Tabs>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Characters</CardTitle>
            <CardDescription>
              Tradeable characters from {animeName}
              {!searchQuery &&
                ` (${charactersLimit} of ${animeCharacters.length})`}
            </CardDescription>
            <div className="ml-4">
              <Input
                placeholder="Search characters (server-side)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayCharacters.map((stock: any) => {
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

                const userHolding = userPortfolio.find(
                  (p) => p.stockId === stock.id
                );

                return (
                  <Card
                    key={stock.id}
                    className="transition-all hover:shadow-md"
                  >
                    <Link
                      href={`/character/${stock.characterSlug || stock.id}`}
                    >
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
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xl font-bold text-foreground break-all">
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
                        {userHolding && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            You own: {userHolding.shares.toLocaleString()}{" "}
                            shares
                          </div>
                        )}
                      </CardContent>
                    </Link>
                    {userHolding && userHolding.shares > 0 && (
                      <div className="p-4 pt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedStockForSell(stock.id);
                            setShowSellDialog(true);
                          }}
                        >
                          Sell Shares
                        </Button>
                      </div>
                    )}
                    <div className="p-4 pt-0">
                      <Button
                        size="sm"
                        className="w-full"
                        variant={
                          selectedChartStocks.has(stock.id)
                            ? "destructive"
                            : "outline"
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleChartStock(stock.id);
                        }}
                      >
                        {selectedChartStocks.has(stock.id) ? (
                          <>
                            <TrendingDown className="mr-2 h-4 w-4" /> Remove
                            from Graph
                          </>
                        ) : (
                          <>
                            <TrendingUp className="mr-2 h-4 w-4" /> Add to Graph
                          </>
                        )}
                      </Button>
                    </div>{" "}
                  </Card>
                );
              })}
            </div>

            {!searchQuery && animeCharacters.length > charactersLimit && (
              <div className="flex justify-center mt-6">
                <Button
                  onClick={() => setCharactersLimit((prev) => prev + 20)}
                  variant="outline"
                  className="px-8"
                >
                  Show More Characters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showSellDialog && selectedStockForSell && (
        <SellDialog
          stockId={selectedStockForSell}
          maxShares={
            userPortfolio.find((p) => p.stockId === selectedStockForSell)
              ?.shares || 0
          }
          onClose={() => {
            setShowSellDialog(false);
            setSelectedStockForSell(null);
          }}
        />
      )}
    </div>
  );
}
