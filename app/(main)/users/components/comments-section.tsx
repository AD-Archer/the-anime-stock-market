"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ContentModeration } from "@/components/content-moderation";
import { MessageContent } from "@/components/chat/message-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ThumbsDown,
  ThumbsUp,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import type { Comment, Stock } from "@/lib/types";
import { useStore } from "@/lib/store";

type CommentsSectionProps = {
  comments: Comment[];
  stocks: Stock[];
  hideOnProfile?: boolean;
};

export function CommentsSection({
  comments: allComments,
  stocks,
  hideOnProfile = true,
}: CommentsSectionProps) {
  const [sortMode, setSortMode] = useState<"recent" | "popular">("recent");
  const { users } = useStore();

  const comments = useMemo(() => {
    if (hideOnProfile) {
      return allComments.filter(
        (c) => c.premiumOnly !== true && c.location !== "premium_page"
      );
    }
    return allComments;
  }, [allComments, hideOnProfile]);

  const sortedComments = useMemo(() => {
    const next = [...comments];
    if (sortMode === "popular") {
      next.sort((a, b) => {
        const scoreA = (a.likedBy?.length || 0) - (a.dislikedBy?.length || 0);
        const scoreB = (b.likedBy?.length || 0) - (b.dislikedBy?.length || 0);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
      return next;
    }
    return next.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [comments, sortMode]);

  const visibleComments = sortedComments.slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Recent Comments</h2>
          <Badge variant="secondary" className="ml-1">
            {comments.length}
          </Badge>
        </div>
        <Select
          value={sortMode}
          onValueChange={(value) => setSortMode(value as "recent" | "popular")}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="popular">Most popular</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="p-4 sm:p-6">
        {visibleComments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No comments yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Comments on characters will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleComments.map((comment) => {
              const character = comment.characterId
                ? stocks.find((s) => s.id === comment.characterId)
                : null;
              const destination = comment.characterId
                ? `/character/${
                    character?.characterSlug || comment.characterId
                  }`
                : comment.animeId
                ? `/anime/${comment.animeId}`
                : `/market`;
              const hasSensitiveContent = (comment.tags || []).some(
                (tag) => tag === "nsfw" || tag === "spoiler"
              );
              const author = users.find((u) => u.id === comment.userId);

              return (
                <div
                  key={comment.id}
                  className="p-4 rounded-xl border border-border hover:border-primary/20 hover:bg-muted/30 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      {author && (
                        <Link
                          href={`/users/${
                            author.displaySlug || author.username
                          }`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {author.displayName || author.username}
                        </Link>
                      )}
                      {author?.isAdmin && (
                        <Badge
                          variant="secondary"
                          className="text-xs px-1.5 py-0"
                        >
                          Admin
                        </Badge>
                      )}
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {comment.timestamp.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <Link
                      href={destination}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      {character?.characterName ||
                        (comment.animeId ? "Anime" : "Market")}
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* Content */}
                  {hasSensitiveContent ? (
                    (() => {
                      const primaryTag = (comment.tags || []).includes("nsfw")
                        ? "nsfw"
                        : "spoiler";
                      const reason =
                        (comment.tags || []).length > 1
                          ? (comment.tags || [])
                              .map((tag) => tag.toUpperCase())
                              .join(" & ")
                          : undefined;
                      return (
                        <ContentModeration type={primaryTag} reason={reason}>
                          <MessageContent
                            content={comment.content}
                            enablePreviews={false}
                          />
                        </ContentModeration>
                      );
                    })()
                  ) : (
                    <div className="text-sm text-foreground">
                      <MessageContent
                        content={comment.content}
                        enablePreviews={false}
                      />
                    </div>
                  )}

                  {/* Tags & Stats */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    {(comment.tags || []).length > 0 && (
                      <div className="flex gap-1">
                        {comment.tags?.map((tag) => (
                          <Badge
                            key={`${comment.id}-${tag}`}
                            variant={
                              tag === "nsfw" ? "destructive" : "secondary"
                            }
                            className="text-xs"
                          >
                            {tag.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {comment.likedBy.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="h-3 w-3" />
                        {comment.dislikedBy.length}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
