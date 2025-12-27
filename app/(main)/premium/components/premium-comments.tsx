"use client";

import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThumbsDown, ThumbsUp, Trash2, Pencil } from "lucide-react";
import type { Comment } from "@/lib/types";
import { useStore } from "@/lib/store";
import { getUserAvatarUrl, getUserInitials } from "@/lib/avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PremiumCommentsProps = {
  premiumOnly?: boolean;
  hideOnProfile?: boolean; // If true, don't show in profile view
};

export function PremiumComments({
  premiumOnly = false,
  hideOnProfile = false,
}: PremiumCommentsProps) {
  const {
    currentUser,
    comments,
    users,
    addComment,
    editComment,
    deleteComment,
    toggleCommentReaction,
    refreshComments,
  } = useStore();

  const [sortMode, setSortMode] = useState<"recent" | "popular">("recent");
  const [newCommentContent, setNewCommentContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null
  );
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  const reloadComments = useCallback(async () => {
    setIsLoadingComments(true);
    try {
      await refreshComments();
    } finally {
      setIsLoadingComments(false);
    }
  }, [refreshComments]);

  useEffect(() => {
    void reloadComments();
  }, [reloadComments]);

  // Filter comments for this section
  const sectionComments = useMemo(() => {
    return comments.filter((c) => {
      const isPremiumLocation =
        c.location === "premium_page" ||
        (!c.location && c.premiumOnly === true);
      // Must be from premium_page location (or legacy premium-only entries)
      if (!isPremiumLocation) {
        return false;
      }

      // Filter by premium status
      if (premiumOnly) {
        return c.premiumOnly === true;
      } else {
        return c.premiumOnly !== true;
      }
    });
  }, [comments, premiumOnly]);

  // Sort comments
  const sortedComments = useMemo(() => {
    const next = [...sectionComments];
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
  }, [sectionComments, sortMode]);

  // Check if user is premium
  const isPremium = currentUser?.premiumMeta?.isPremium ?? false;

  // If this is premium-only and user is not premium, don't show
  if (premiumOnly && !isPremium) {
    return null;
  }

  const handleAddComment = async () => {
    if (!newCommentContent.trim() || !currentUser) return;

    try {
      await addComment({
        content: newCommentContent,
        premiumOnly,
        location: "premium_page",
      });
      setNewCommentContent("");
      await reloadComments();
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingContent.trim() || !currentUser) return;

    try {
      await editComment(commentId, editingContent);
      setEditingCommentId(null);
      setEditingContent("");
    } catch (error) {
      console.error("Failed to edit comment:", error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser) return;

    try {
      await deleteComment(commentId);
      setDeletingCommentId(null);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser) return;

    try {
      await toggleCommentReaction(commentId, "like");
    } catch (error) {
      console.error("Failed to like comment:", error);
    }
  };

  const handleDislikeComment = async (commentId: string) => {
    if (!currentUser) return;

    try {
      await toggleCommentReaction(commentId, "dislike");
    } catch (error) {
      console.error("Failed to dislike comment:", error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>
            {premiumOnly ? "🔒 Premium Members Chat" : "💬 Community Chat"}
          </CardTitle>
          <CardDescription>
            {premiumOnly
              ? "Exclusive discussion for premium members"
              : "Join the conversation with the community"}
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
      <CardContent className="space-y-4">
        {/* Comment Input */}
        {currentUser && (!premiumOnly || isPremium) ? (
          <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
            <Textarea
              placeholder={
                premiumOnly
                  ? "Share your thoughts (premium members only)..."
                  : "Share your thoughts with the community..."
              }
              value={newCommentContent}
              onChange={(
                e: ChangeEvent<HTMLTextAreaElement>
              ) => setNewCommentContent(e.target.value)}
              className="min-h-20"
            />
            <Button
              onClick={handleAddComment}
              disabled={!newCommentContent.trim()}
              className="w-full sm:w-auto"
            >
              Post Comment
            </Button>
          </div>
        ) : currentUser && premiumOnly && !isPremium ? (
          <div className="border rounded-lg p-4 bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">
              Premium members only.{" "}
              <Link href="/donate" className="text-primary hover:underline">
                Become a premium member
              </Link>{" "}
              to chat here.
            </p>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">
              <Link
                href="/auth/signin"
                className="text-primary hover:underline"
              >
                Sign in
              </Link>{" "}
              to join the conversation.
            </p>
          </div>
        )}

        {/* Comments List */}
        {isLoadingComments ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Loading comments…
          </p>
        ) : sortedComments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          <div className="space-y-4">
            {sortedComments.map((comment) => {
              const author = users.find((u) => u.id === comment.userId);
              const hasSensitiveContent = (comment.tags || []).some(
                (tag) => tag === "nsfw" || tag === "spoiler"
              );
              const isEditingThis = editingCommentId === comment.id;
              const isOwnComment = currentUser?.id === comment.userId;

              return (
                <div
                  key={comment.id}
                  className="rounded border p-3 space-y-2 hover:bg-muted/50 transition-colors"
                >
                  {/* Comment Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {author && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage
                          src={getUserAvatarUrl(author)}
                            alt={author.displayName || author.username}
                          />
                          <AvatarFallback>
                            {getUserInitials(
                              author.displayName || author.username
                            )}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="space-y-1 min-w-0 flex-1">
                        {author && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/users/${
                                author.displaySlug || author.username
                              }`}
                              className="text-sm font-medium hover:underline text-foreground break-words"
                            >
                              {author.displayName || author.username}
                            </Link>
                            {author.isAdmin && (
                              <Badge variant="secondary" className="text-xs">
                                Admin
                              </Badge>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {comment.timestamp.toLocaleDateString()}{" "}
                          {comment.timestamp.toLocaleTimeString()}
                          {comment.editedAt &&
                            ` (edited ${comment.editedAt.toLocaleTimeString()})`}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {isOwnComment && (
                      <div className="flex gap-1">
                        {!isEditingThis && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingContent(comment.content);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingCommentId(comment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comment Content */}
                  {isEditingThis ? (
                    <div className="space-y-2 mt-2">
                      <Textarea
                        value={editingContent}
                        onChange={(
                          e: ChangeEvent<HTMLTextAreaElement>
                        ) => setEditingContent(e.target.value)}
                        className="min-h-20"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditComment(comment.id)}
                          disabled={!editingContent.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingContent("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : hasSensitiveContent ? (
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
                    </>
                  )}

                  {/* Reactions */}
                  {currentUser && (
                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={() => handleLikeComment(comment.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ThumbsUp
                          className={`h-4 w-4 ${
                            comment.likedBy?.includes(currentUser.id)
                              ? "fill-current text-primary"
                              : ""
                          }`}
                        />
                        {comment.likedBy?.length || 0}
                      </button>
                      <button
                        onClick={() => handleDislikeComment(comment.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ThumbsDown
                          className={`h-4 w-4 ${
                            comment.dislikedBy?.includes(currentUser.id)
                              ? "fill-current text-red-500"
                              : ""
                          }`}
                        />
                        {comment.dislikedBy?.length || 0}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deletingCommentId}
          onOpenChange={() => setDeletingCommentId(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete comment?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The comment will be permanently
                deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeletingCommentId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  deletingCommentId && handleDeleteComment(deletingCommentId)
                }
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
