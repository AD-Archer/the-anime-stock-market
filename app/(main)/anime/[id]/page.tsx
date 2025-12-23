"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { User, Comment, ContentTag } from "@/lib/types";
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
      const tags =
        replyTag === "none" ? [] : ([replyTag] as ContentTag[]);
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
    if (confirm("Are you sure you want to delete this comment?")) {
      await onDelete(comment.id);
    }
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
          <p className="text-sm text-muted-foreground">{content}</p>
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
          <p className="text-sm text-muted-foreground">{nsfwContent}</p>
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
          <p className="text-sm text-muted-foreground">{spoilerContent}</p>
        </ContentModeration>
      );
    }

    return <p className="text-sm text-muted-foreground">{content}</p>;
  };

  return (
    <div className={`${level > 0 ? "ml-6 border-l-2 border-muted pl-4" : ""}`}>
      <div className="rounded-lg border p-3 bg-card">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href={`/users/${comment.userId}`}
              className="font-semibold text-foreground hover:underline"
            >
              {user?.username || "Unknown"}
            </Link>
            {user?.isAdmin && (
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            )}
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
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {comment.timestamp.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
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
                onClick={handleDelete}
                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              >
                Delete
              </Button>
            )}
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
              userReaction === "like"
                ? "text-chart-4"
                : "text-muted-foreground"
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

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={async (reason, description) => {
          await onReport(comment.id, reason, description);
        }}
        commentId={comment.id}
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
    currentUser,
    addComment,
    editComment,
    deleteComment,
    getAnimeComments,
    users,
    reportComment,
    toggleCommentReaction,
  } = useStore();
  const [comment, setComment] = useState("");
  const [commentTag, setCommentTag] = useState<"none" | ContentTag>("none");
  const [isMobile, setIsMobile] = useState(false);

  const animeComments = getAnimeComments(id);

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

  const animeName = animeCharacters.length > 0 ? animeCharacters[0].anime : "";
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

    // Sort root comments by timestamp
    rootComments.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

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

  const handleAddComment = async () => {
    if (comment.trim()) {
      const tags =
        commentTag === "none" ? [] : ([commentTag] as ContentTag[]);
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
                      Comments ({rootComments.length})
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
                        className="w-full"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Post Comment
                      </Button>
                    </div>

                    {rootComments.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">
                        No comments yet. Start the conversation!
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {rootComments.map((thread) => (
                          <CommentThread
                            key={thread.id}
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
                        ))}
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
