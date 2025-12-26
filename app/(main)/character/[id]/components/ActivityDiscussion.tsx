"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { getUserProfileHref } from "@/lib/user-profile";
import CommentThread from "./CommentThread";
import { User, Comment, ContentTag } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ReportModal } from "@/components/report-modal";

interface Props {
  isMobile: boolean;
  rootComments: (Comment & { replies: Comment[] })[];
  comment: string;
  setComment: (s: string) => void;
  commentTag: "none" | ContentTag;
  setCommentTag: (v: "none" | ContentTag) => void;
  onAddComment: () => Promise<void>;
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
  users: User[];
  characterTransactions: any[];
  currentUser: User | null;
  commentMap: Map<string, Comment & { replies: Comment[] }>;
}

export default function ActivityDiscussion({
  isMobile,
  rootComments,
  comment,
  setComment,
  commentTag,
  setCommentTag,
  onAddComment,
  onAddReply,
  onEditComment,
  onDeleteComment,
  onReportComment,
  onToggleReaction,
  users,
  characterTransactions,
  currentUser,
  commentMap,
}: Props) {
  return (
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
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
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
                <SelectTrigger suppressHydrationWarning>
                  <SelectValue placeholder="Add a tag (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Tag</SelectItem>
                  <SelectItem value="spoiler">Spoiler</SelectItem>
                  <SelectItem value="nsfw">NSFW</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={onAddComment} disabled={!comment.trim()}>
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
                                (user.username || "?").charAt(0).toUpperCase()
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
                          {tx.shares} shares @ ${tx.pricePerShare.toFixed(2)}
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
  );
}
