"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, Comment, ContentTag } from "@/lib/types";
import { getUserProfileHref } from "@/lib/user-profile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Flag, ThumbsUp, ThumbsDown, Crown } from "lucide-react";
import { ContentModeration } from "@/components/content-moderation";
import { MessageContent } from "@/components/chat/message-content";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ReportModal } from "@/components/report-modal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CommentThreadProps {
  comment: Comment & { replies?: Comment[] };
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

export default function CommentThread({
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

  const sortedReplies = (replies || []).sort(
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
          type={primaryTag as any}
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
              {user?.premiumMeta?.isPremium && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Crown className="h-4 w-4 text-purple-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Premium User</p>
                  </TooltipContent>
                </Tooltip>
              )}
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
              <SelectTrigger suppressHydrationWarning>
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
              comment={reply as Comment & { replies?: Comment[] }}
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
