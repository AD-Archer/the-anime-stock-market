"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { Comment, Stock } from "@/lib/types";
import { useStore } from "@/lib/store";

type CommentsSectionProps = {
  comments: Comment[];
  stocks: Stock[];
};

export function CommentsSection({ comments, stocks }: CommentsSectionProps) {
  const [sortMode, setSortMode] = useState<"recent" | "popular">("recent");
  const { users } = useStore();

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
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Recent Comments</CardTitle>
          <CardDescription>
            Showing 5 {sortMode === "recent" ? "most recent" : "most popular"}{" "}
            comments and replies.
          </CardDescription>
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={sortMode}
            onValueChange={(value) =>
              setSortMode(value as "recent" | "popular")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="popular">Most popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {visibleComments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <div className="space-y-4">
            {visibleComments.map((comment) => {
              const character = comment.characterId
                ? stocks.find((s) => s.id === comment.characterId)
                : null;
              const destination = comment.characterId
                ? `/character/${comment.characterId}`
                : `/anime/${comment.animeId}`;
              const hasSensitiveContent = (comment.tags || []).some(
                (tag) => tag === "nsfw" || tag === "spoiler"
              );

              return (
                <div key={comment.id} className="rounded border p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <Link
                      href={destination}
                      className="font-medium text-foreground hover:underline"
                    >
                      {character
                        ? `${character.characterName} (${character.anime})`
                        : `Anime: ${comment.animeId}`}
                    </Link>
                    <span>
                      {comment.timestamp.toLocaleDateString()}{" "}
                      {comment.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(() => {
                      const author = users.find((u) => u.id === comment.userId);
                      if (!author) return null;
                      return (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/users/${author.username}`}
                            className="hover:underline"
                          >
                            {author.username}
                          </Link>
                          {author.isAdmin && (
                            <Badge variant="secondary">Admin</Badge>
                          )}
                        </div>
                      );
                    })()}
                  </div>

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
                          {(comment.tags || []).length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {comment.tags?.map((tag) => (
                                <Badge
                                  key={`${comment.id}-${tag}`}
                                  variant={
                                    tag === "nsfw" ? "destructive" : "secondary"
                                  }
                                >
                                  {tag.toUpperCase()}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </ContentModeration>
                      );
                    })()
                  ) : (
                    <>
                      <MessageContent
                        content={comment.content}
                        enablePreviews={false}
                      />
                      {(comment.tags || []).length > 0 && (
                        <div className="flex gap-2">
                          {comment.tags?.map((tag) => (
                            <Badge
                              key={`${comment.id}-${tag}`}
                              variant={
                                tag === "nsfw" ? "destructive" : "secondary"
                              }
                            >
                              {tag.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" /> {comment.likedBy.length} •{" "}
                    <ThumbsDown className="h-3 w-3" />{" "}
                    {comment.dislikedBy.length}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
