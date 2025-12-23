"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { Comment, Stock } from "@/lib/types";

type CommentsSectionProps = {
  comments: Comment[];
  stocks: Stock[];
};

export function CommentsSection({ comments, stocks }: CommentsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Comments</CardTitle>
        <CardDescription>Latest comments and replies made by this user.</CardDescription>
      </CardHeader>
      <CardContent>
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <div className="space-y-4">
            {comments.slice(0, 5).map((comment) => {
              const character = comment.characterId
                ? stocks.find((s) => s.id === comment.characterId)
                : null;
              const destination = comment.characterId
                ? `/character/${comment.characterId}`
                : `/anime/${comment.animeId}`;
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
                  <p className="text-sm text-foreground">{comment.content}</p>
                  {(comment.tags || []).length > 0 && (
                    <div className="flex gap-2">
                      {comment.tags?.map((tag) => (
                        <Badge
                          key={`${comment.id}-${tag}`}
                          variant={tag === "nsfw" ? "destructive" : "secondary"}
                        >
                          {tag.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" /> {comment.likedBy.length} •{" "}
                    <ThumbsDown className="h-3 w-3" /> {comment.dislikedBy.length}
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
