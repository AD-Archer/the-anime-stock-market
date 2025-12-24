"use client";

import { useState, useMemo, useRef, type ChangeEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Send } from "lucide-react";
import { Comment, ContentTag } from "@/lib/types";
import { ReportModal } from "@/components/report-modal";
import { ContentModeration } from "@/components/content-moderation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThumbsUp, ThumbsDown, Flag } from "lucide-react";
import { MessageContent } from "@/components/chat/message-content";
import { getUserProfileHref } from "@/lib/user-profile";

interface MarketDiscussionProps {
  currentUser: any;
  marketComments: Comment[];
  users: any[];
  onAddComment: (content: string, tags: ContentTag[]) => Promise<void>;
  onAddReply: (
    parentId: string,
    content: string,
    tags?: ContentTag[]
  ) => Promise<void>;
  onEditComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onReportComment: (
    commentId: string,
    reason: string,
    description?: string
  ) => Promise<void>;
  onToggleReaction: (
    commentId: string,
    reaction: "like" | "dislike"
  ) => Promise<void>;
}

export function MarketDiscussion({
  currentUser,
  marketComments,
  users,
  onAddComment,
  onAddReply,
  onEditComment,
  onDeleteComment,
  onReportComment,
  onToggleReaction,
}: MarketDiscussionProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Process comments into threaded structure
  const { commentMap, rootComments } = useMemo(() => {
    const commentMap = new Map<string, Comment & { replies: Comment[] }>();
    const rootComments: (Comment & { replies: Comment[] })[] = [];

    // First pass: create comment objects with empty replies arrays
    marketComments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build the tree structure
    marketComments.forEach((comment) => {
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
  }, [marketComments]);

  const handleSendMessage = async () => {
    if (message.trim() && currentUser) {
      await onAddComment(message.trim(), []);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="mb-8 w-full min-w-0">
      <Card className="h-[600px] flex flex-col min-w-0">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Market Chat
          </CardTitle>
          <CardDescription>
            Live discussion about the market, trading strategies, and anime
            stocks
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 min-w-0 overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-0 overflow-x-hidden">
            {rootComments.length > 0 ? (
              (() => {
                let lastDate = "";
                return rootComments.map((thread) => {
                  const dateLabel = thread.timestamp.toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" }
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
                        onReply={onAddReply}
                        onEdit={onEditComment}
                        onDelete={onDeleteComment}
                        onReport={onReportComment}
                        onToggleReaction={onToggleReaction}
                        level={0}
                      />
                    </div>
                  );
                });
              })()
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No messages yet. Be the first to start the conversation!
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {currentUser ? (
            <div className="border-t p-4 flex-shrink-0">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  No NSFW
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  No Spoilers
                </Badge>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-t p-4 flex-shrink-0">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">
                  Sign in to join the market chat
                </p>
                <Link href="/auth/signin">
                  <Button size="sm">Sign In</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Comment Thread Component (copied from anime detail page)
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
}: {
  comment: Comment & { replies: Comment[] };
  commentMap: Map<string, Comment & { replies: Comment[] }>;
  users: any[];
  currentUser: any;
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
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyTag, setReplyTag] = useState<"none" | ContentTag>("none");
  const [editContent, setEditContent] = useState(comment.content);

  const user = users.find((u) => u.id === comment.userId);
  const replies = comment.replies;
  const sortedReplies = replies
    .map((reply) => commentMap.get(reply.id)!)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const canEdit =
    currentUser && (currentUser.id === comment.userId || currentUser.isAdmin);
  const canDelete =
    currentUser && (currentUser.id === comment.userId || currentUser.isAdmin);

  const likedBy = comment.likedBy ?? [];
  const dislikedBy = comment.dislikedBy ?? [];
  const userReaction = !currentUser
    ? null
    : likedBy.includes(currentUser.id)
    ? "like"
    : dislikedBy.includes(currentUser.id)
    ? "dislike"
    : null;
  const likeCount = likedBy.length;
  const dislikeCount = dislikedBy.length;

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
    if (editContent.trim()) {
      await onEdit(comment.id, editContent);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    await onDelete(comment.id);
    setShowDeleteDialog(false);
  };

  const handleReaction = async (reaction: "like" | "dislike") => {
    if (!currentUser) return;
    await onToggleReaction(comment.id, reaction);
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
    <div
      className={`w-full min-w-0 max-w-full ${
        level > 0
          ? "ml-4 border-l-2 border-muted pl-4 box-border w-[calc(100%-1rem)]"
          : ""
      }`}
    >
      <div className="rounded-lg border p-3 bg-card max-w-full min-w-0 overflow-hidden">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
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
              {comment.editedAt && (
                <span className="ml-1 text-xs opacity-60">(edited)</span>
              )}
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
                onClick={() => setShowDeleteDialog(true)}
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
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setEditContent(e.target.value)
              }
              rows={2}
              className="text-sm max-h-32 overflow-y-auto"
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
          {currentUser && (
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
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setReplyContent(e.target.value)
              }
              rows={2}
              className="text-sm max-h-32 overflow-y-auto"
            />
            <Select
              value={replyTag}
              onValueChange={(value: string) =>
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
        <div className="mt-2 space-y-2 min-w-0 max-w-full w-full">
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
