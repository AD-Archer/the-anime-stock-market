"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { User, Comment, ContentTag } from "@/lib/types";
import { generateCharacterSlug } from "@/lib/utils";
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
  Flag,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { BuyDialog } from "@/app/(main)/character/components/buy-dialog";
import { SellDialog } from "@/components/sell-dialog";
import { ComparisonChart } from "@/app/(main)/character/components/comparison-chart";
import { ReportModal } from "@/components/report-modal";
import { ContentModeration } from "@/components/content-moderation";
import { MessageContent } from "@/components/chat/message-content";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getUserProfileHref } from "@/lib/user-profile";
import { generateAnimeSlug } from "@/lib/utils";

type TimeRange = "all" | "7d" | "30d" | "90d";

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

  const sortedReplies = replies.sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

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
              {comment.editedAt && (
                <span className="ml-1 text-xs opacity-60">(edited)</span>
              )}
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
    editComment,
    deleteComment,
    getCharacterComments,
    users,
    reportComment,
    toggleCommentReaction,
    getUserPortfolio,
  } = useStore();
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [comment, setComment] = useState("");
  const [commentTag, setCommentTag] = useState<"none" | ContentTag>("none");
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    stocks.find((s) => s.id === id);
  const stockId = stock?.id ?? id;
  const characterIdentifiers =
    stockId === id ? [stockId] : [stockId, id];
  const priceHistory = getStockPriceHistory(stockId);
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
    ? (getUserPortfolio(currentUser.id).find((p) =>
        characterIdentifiers.includes(p.stockId)
      )?.shares ?? 0)
    : 0;
  const animeSlug = stock?.anime ? generateAnimeSlug(stock.anime) : "";

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

  const handleAddComment = async () => {
    if (comment.trim()) {
      const tags = commentTag === "none" ? [] : ([commentTag] as ContentTag[]);
      await addComment({
        animeId: stock.anime.toLowerCase().replace(/\s+/g, "-"),
        content: comment,
        characterId: stockId,
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
        characterId: stockId,
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

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Price History & Activity */}
          <div className="space-y-6 lg:col-span-3">
            {/* Mobile: Discussion Section First */}
            {isMobile && (
              <Card>
                <CardHeader>
                  <CardTitle>Activity & Discussion</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="comments">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="comments">
                        Comments ({rootComments.length})
                      </TabsTrigger>
                      <TabsTrigger value="transactions">
                        Recent Transactions
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="comments" className="space-y-4">
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Share your thoughts about this character..."
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
                        <Button
                          onClick={handleAddComment}
                          disabled={!comment.trim()}
                        >
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
                              const dateLabel =
                                thread.timestamp.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                });
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
                                          tx.type === "buy"
                                            ? "default"
                                            : "secondary"
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
                                          tx.type === "buy"
                                            ? "default"
                                            : "secondary"
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
            )}
          </div>

          {/* Character Info */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="relative mb-4 aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                <Image
                  src={stock.imageUrl || "/placeholder.svg"}
                  alt={stock.characterName}
                  fill
                  className="object-contain"
                />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                {stock.characterName}
              </h1>
              <p className="mb-4 text-muted-foreground">
                <Link
                  href={`/anime/${animeSlug}`}
                  className="hover:underline text-foreground"
                >
                  {stock.anime}
                </Link>
              </p>
              <TruncatedText
                text={stock.description || ""}
                maxLength={300}
                className="mb-6 text-sm text-muted-foreground"
              />

              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Current Price
                  </span>
                  <span className="text-xl font-bold text-foreground break-all">
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
                  <span className="font-mono text-foreground break-all">
                    ${(stock.currentPrice * stock.totalShares).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setShowBuyDialog(true)}>
                  Buy Shares
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSellDialog(true)}
                  disabled={!currentUser || userShares <= 0}
                >
                  Sell Shares
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Charts Section */}
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
                <div className="text-muted-foreground">
                  <ResponsiveContainer
                    width="100%"
                    height={isMobile ? 250 : 300}
                  >
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
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
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
                  <ResponsiveContainer
                    width="100%"
                    height={isMobile ? 200 : 250}
                  >
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
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
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

            <ComparisonChart initialStockId={stockId} timeRange={timeRange} />

            {/* Desktop: Activity & Comments Section */}
            {!isMobile && (
              <Card>
                <CardHeader>
                  <CardTitle>Activity & Discussion</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="comments">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="comments">
                        Comments ({rootComments.length})
                      </TabsTrigger>
                      <TabsTrigger value="transactions">
                        Recent Transactions
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="comments" className="space-y-4">
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Share your thoughts about this character..."
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
                        <Button
                          onClick={handleAddComment}
                          disabled={!comment.trim()}
                        >
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
                              const dateLabel =
                                thread.timestamp.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                });
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
                                          tx.type === "buy"
                                            ? "default"
                                            : "secondary"
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
                                          tx.type === "buy"
                                            ? "default"
                                            : "secondary"
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
            )}
          </div>
        </div>
      </div>

      {showBuyDialog && (
        <BuyDialog stockId={stockId} onClose={() => setShowBuyDialog(false)} />
      )}
      {showSellDialog && (
        <SellDialog
          stockId={stockId}
          maxShares={userShares}
          onClose={() => setShowSellDialog(false)}
        />
      )}
    </div>
  );
}
