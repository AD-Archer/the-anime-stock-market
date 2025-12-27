"use client";

import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ReportModal } from "@/components/report-modal";
import { MessageContent } from "@/components/chat/message-content";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserAvatarUrl, getUserInitials } from "@/lib/avatar";
import { getUserProfileHref } from "@/lib/user-profile";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Crown } from "lucide-react";
import {
  MessageCircle,
  Send,
  Search,
  Plus,
  User as UserIcon,
  CornerUpLeft,
  Flag,
  Pencil,
} from "lucide-react";
import type { Message, Conversation } from "@/lib/types";
import { extractUrls, isExternalUrl } from "@/lib/chat/link-utils";

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    currentUser,
    users,
    messages,
    conversations,
    sendMessage,
    editMessage,
    deleteMessage,
    getConversationMessages,
    getUserConversations,
    createConversation,
    markMessagesAsRead,
    reportMessage,
  } = useStore();
  const router = useRouter();
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [recipientUsername, setRecipientUsername] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(
    null
  );
  const [reportPrefill, setReportPrefill] = useState<{
    reason?:
      | "spam"
      | "harassment"
      | "inappropriate"
      | "nsfw"
      | "spoiler"
      | "other";
    description?: string;
  } | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null
  );
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  // Handle conversation query parameter
  useEffect(() => {
    const conversationParam = searchParams.get("conversation");
    if (conversationParam && conversations.length > 0) {
      const conversation = conversations.find(
        (c) => c.id === conversationParam
      );
      if (conversation) {
        Promise.resolve().then(() =>
          setSelectedConversationId(conversationParam)
        );
        // Clear the URL parameter
        router.replace("/messages", { scroll: false });
      }
    }
  }, [searchParams, conversations, router]);

  // Load conversations when user is available
  useEffect(() => {
    if (currentUser && !authLoading) {
      Promise.resolve().then(() => setIsLoadingConversations(true));
      getUserConversations(currentUser.id).finally(() => {
        setIsLoadingConversations(false);
      });
    }
  }, [currentUser, authLoading, getUserConversations]);

  // Load messages for selected conversation
  useEffect(() => {
    if (selectedConversationId && currentUser) {
      getConversationMessages(selectedConversationId);
      markMessagesAsRead(selectedConversationId, currentUser.id);
    }
  }, [
    selectedConversationId,
    currentUser,
    getConversationMessages,
    markMessagesAsRead,
  ]);

  const userSearchResults = useMemo(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter(
        (u) =>
          u.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
          u.id !== currentUser?.id
      );
      return filtered.slice(0, 10); // Limit to 10 results
    }
    return [];
  }, [searchQuery, users, currentUser]);

  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  const conversationMessages = useMemo(() => {
    if (!selectedConversationId) return [];
    return messages
      .filter((m) => m.conversationId === selectedConversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [messages, selectedConversationId]);

  const conversationMessageMap = useMemo(() => {
    return new Map(
      conversationMessages.map((message) => [message.id, message])
    );
  }, [conversationMessages]);

  const otherParticipant = useMemo(() => {
    if (!selectedConversation || !currentUser) return null;
    const otherUserId = selectedConversation.participants.find(
      (id) => id !== currentUser.id
    );
    return users.find((u) => u.id === otherUserId) || null;
  }, [selectedConversation, currentUser, users]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    return conversations.filter((conversation) => {
      const otherUserId = conversation.participants.find(
        (id) => id !== currentUser?.id
      );
      const otherUser = users.find((u) => u.id === otherUserId);
      return otherUser?.username
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    });
  }, [conversations, searchQuery, users, currentUser]);

  const handleSendMessage = async () => {
    if (!selectedConversationId || !newMessage.trim() || !currentUser) return;

    const message = await sendMessage(
      selectedConversationId,
      newMessage.trim(),
      replyToMessageId || undefined
    );
    if (message) {
      setNewMessage("");
      setReplyToMessageId(null);
    }
  };

  const handleStartNewConversation = async (recipientId: string) => {
    if (!currentUser || !messageContent.trim()) return;

    const conversationId = createConversation([currentUser.id, recipientId]);
    const message = await sendMessage(conversationId, messageContent.trim());

    if (message) {
      setRecipientUsername("");
      setMessageContent("");
      setShowNewConversation(false);
      setSelectedConversationId(conversationId);
    }
  };

  const handleUserSelect = (userId: string) => {
    if (!currentUser) return;

    const existingConversation = conversations.find(
      (c) =>
        c.participants.length === 2 &&
        c.participants.includes(currentUser.id) &&
        c.participants.includes(userId)
    );

    if (existingConversation) {
      setSelectedConversationId(existingConversation.id);
    } else {
      setRecipientUsername(users.find((u) => u.id === userId)?.username || "");
    }
    setSearchQuery("");
  };

  const handleStartReply = (messageId: string) => {
    setReplyToMessageId(messageId);
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
    setReplyToMessageId(null);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editingContent.trim()) return;
    await editMessage(messageId, editingContent.trim());
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleReport = (messageId: string, description?: string) => {
    setReportingMessageId(messageId);
    setReportPrefill(description ? { reason: "spam", description } : null);
  };

  const handleDeleteMessage = async () => {
    if (!deletingMessageId) return;
    const success = await deleteMessage(deletingMessageId);
    if (success) {
      setDeletingMessageId(null);
    }
  };

  if (authLoading || !currentUser) {
    return (
      <div
        className="container mx-auto px-4 py-8"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-10 w-44 rounded-md bg-muted" />
            <div className="h-4 w-72 rounded-md bg-muted" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="space-y-3">
                <div className="h-9 w-full rounded-md bg-muted" />
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded-md bg-muted" />
                      <div className="h-3 w-48 rounded-md bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="space-y-3">
                <div className="h-8 w-40 rounded-md bg-muted" />
                <div className="h-96 w-full rounded-md bg-muted" />
                <div className="flex gap-2">
                  <div className="h-10 flex-1 rounded-md bg-muted" />
                  <div className="h-10 w-24 rounded-md bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground">Chat with other users</p>
        </div>
        <Dialog
          open={showNewConversation}
          onOpenChange={setShowNewConversation}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Conversation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Search Users</label>
                <div className="relative">
                  <Input
                    placeholder="Type a username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {userSearchResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                    {userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleUserSelect(user.id)}
                        className="w-full p-2 text-left hover:bg-muted flex items-center gap-2"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {user.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {recipientUsername && (
                <div>
                  <label className="text-sm font-medium">Recipient</label>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <UserIcon className="h-4 w-4" />
                    <span>{recipientUsername}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Write your message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewConversation(false);
                    setRecipientUsername("");
                    setMessageContent("");
                    setSearchQuery("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const recipient = users.find(
                      (u) => u.username === recipientUsername
                    );
                    if (recipient) {
                      handleStartNewConversation(recipient.id);
                    }
                  }}
                  disabled={!recipientUsername.trim() || !messageContent.trim()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingConversations ? (
              <div className="p-6 text-center text-muted-foreground">
                <p>Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm">
                  Start a new conversation to get started
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => {
                  const otherUserId = conversation.participants.find(
                    (id) => id !== currentUser.id
                  );
                  const otherUser = users.find((u) => u.id === otherUserId);
                  const unreadCount = messages.filter(
                    (m) =>
                      m.conversationId === conversation.id &&
                      !m.readBy.includes(currentUser.id) &&
                      m.senderId !== currentUser.id
                  ).length;

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                        selectedConversationId === conversation.id
                          ? "bg-muted"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Link
                          href={getUserProfileHref(otherUser, otherUserId)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0"
                        >
                          <Avatar className="h-10 w-10 hover:opacity-80 transition-opacity">
                            {otherUser && (
                              <AvatarImage
                                src={getUserAvatarUrl(otherUser)}
                                alt={otherUser.username}
                              />
                            )}
                            <AvatarFallback>
                              {getUserInitials(otherUser?.username || "??")}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Link
                                href={getUserProfileHref(
                                  otherUser,
                                  otherUserId
                                )}
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium truncate hover:underline"
                              >
                                {otherUser?.username || "Unknown User"}
                              </Link>
                              {otherUser?.premiumMeta?.isPremium && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Crown className="h-4 w-4 text-purple-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Premium User</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {conversation.lastMessage.timestamp.toLocaleDateString()}
                              </span>
                              {unreadCount > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  {unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage.content ||
                              "No messages yet"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages View */}
        <Card className="lg:col-span-2">
          {selectedConversation && otherParticipant ? (
            <>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={getUserAvatarUrl(otherParticipant)}
                    alt={otherParticipant.username}
                  />
                  <AvatarFallback>
                    {getUserInitials(otherParticipant.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    href={getUserProfileHref(
                      otherParticipant,
                      otherParticipant.id
                    )}
                  >
                    <CardTitle className="hover:underline cursor-pointer">
                      {otherParticipant.username}
                    </CardTitle>
                  </Link>
                  <CardDescription>
                    Conversation with {otherParticipant.username}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col h-96">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4">
                  {conversationMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    (() => {
                      let lastDate = "";
                      return conversationMessages.map((message) => {
                        const isFromMe = message.senderId === currentUser.id;
                        const dateLabel = message.createdAt.toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        );
                        const showDate = dateLabel !== lastDate;
                        lastDate = dateLabel;
                        const isEditing = editingMessageId === message.id;
                        const replyMessage = message.replyToMessageId
                          ? conversationMessageMap.get(message.replyToMessageId)
                          : null;
                        const replyAuthor = replyMessage
                          ? users.find((u) => u.id === replyMessage.senderId)
                          : null;
                        const sender =
                          users.find((u) => u.id === message.senderId) ||
                          (message.senderId === currentUser.id
                            ? currentUser
                            : null);
                        const externalUrls = extractUrls(
                          message.content
                        ).filter(isExternalUrl);

                        return (
                          <div key={message.id} className="space-y-2">
                            {showDate && (
                              <div className="flex justify-center">
                                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                  {dateLabel}
                                </span>
                              </div>
                            )}
                            <div
                              className={`flex gap-3 ${
                                isFromMe ? "justify-end" : "justify-start"
                              }`}
                            >
                              {!isFromMe && (
                                <Link
                                  href={getUserProfileHref(
                                    sender,
                                    message.senderId
                                  )}
                                >
                                  <Avatar className="h-8 w-8 hover:opacity-80 transition-opacity cursor-pointer">
                                    {sender && (
                                      <AvatarImage
                                        src={getUserAvatarUrl(sender)}
                                        alt={sender.username}
                                      />
                                    )}
                                    <AvatarFallback className="text-xs">
                                      {getUserInitials(
                                        sender?.username || "??"
                                      )}
                                    </AvatarFallback>
                                  </Avatar>
                                </Link>
                              )}
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  isFromMe
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                {replyMessage && (
                                  <div className="mb-2 rounded-md border border-muted/40 bg-background/60 p-2 text-xs">
                                    <p className="font-medium">
                                      {replyAuthor?.username || "Unknown"}
                                    </p>
                                    <p className="text-muted-foreground line-clamp-2">
                                      {replyMessage.content}
                                    </p>
                                  </div>
                                )}
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editingContent}
                                      onChange={(e) =>
                                        setEditingContent(e.target.value)
                                      }
                                      rows={3}
                                      className="text-sm"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleSaveEdit(message.id)
                                        }
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingMessageId(null);
                                          setEditingContent("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <MessageContent
                                    content={message.content}
                                    linkClassName={
                                      isFromMe
                                        ? "text-primary-foreground underline"
                                        : "text-primary underline"
                                    }
                                  />
                                )}
                                <div className="mt-2 flex items-center justify-between text-xs opacity-70">
                                  <span>
                                    {message.createdAt.toLocaleTimeString()}
                                    {message.editedAt && (
                                      <span className="ml-1">(edited)</span>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() =>
                                        handleStartReply(message.id)
                                      }
                                    >
                                      <CornerUpLeft className="mr-1 h-3 w-3" />
                                      Reply
                                    </Button>
                                    {isFromMe && !isEditing && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs"
                                          onClick={() =>
                                            handleStartEdit(message)
                                          }
                                        >
                                          <Pencil className="mr-1 h-3 w-3" />
                                          Edit
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs text-destructive"
                                          onClick={() =>
                                            setDeletingMessageId(message.id)
                                          }
                                        >
                                          Delete
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => handleReport(message.id)}
                                    >
                                      <Flag className="mr-1 h-3 w-3" />
                                      Report
                                    </Button>
                                    {externalUrls.length > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() =>
                                          handleReport(
                                            message.id,
                                            `Suspicious link: ${externalUrls[0]}`
                                          )
                                        }
                                      >
                                        <Flag className="mr-1 h-3 w-3" />
                                        Report Link
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {isFromMe && (
                                <Link
                                  href={getUserProfileHref(
                                    currentUser,
                                    currentUser.id
                                  )}
                                >
                                  <Avatar className="h-8 w-8 hover:opacity-80 transition-opacity cursor-pointer">
                                    <AvatarImage
                                      src={getUserAvatarUrl(currentUser)}
                                      alt={currentUser.username}
                                    />
                                    <AvatarFallback className="text-xs">
                                      {getUserInitials(currentUser.username)}
                                    </AvatarFallback>
                                  </Avatar>
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
                <div className="border-t p-4 space-y-2">
                  {replyToMessageId &&
                    (() => {
                      const replyMessage =
                        conversationMessageMap.get(replyToMessageId) || null;
                      const replyUser = replyMessage
                        ? users.find((u) => u.id === replyMessage.senderId)
                        : null;
                      if (!replyMessage) return null;
                      return (
                        <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-xs">
                          <div>
                            <p className="font-medium">
                              Replying to {replyUser?.username || "Unknown"}
                            </p>
                            <p className="text-muted-foreground line-clamp-1">
                              {replyMessage.content}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setReplyToMessageId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      );
                    })()}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleSendMessage()
                      }
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  Select a conversation
                </h3>
                <p>Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </Card>
      </div>
      <ReportModal
        isOpen={Boolean(reportingMessageId)}
        onClose={() => {
          setReportingMessageId(null);
          setReportPrefill(null);
        }}
        onSubmit={async (reason, description) => {
          if (!reportingMessageId) return;
          await reportMessage(reportingMessageId, reason, description);
        }}
        title="Report Message"
        description="Report suspicious or inappropriate messages."
        initialReason={reportPrefill?.reason ?? "other"}
        initialDescription={reportPrefill?.description ?? ""}
      />
      <Dialog
        open={Boolean(deletingMessageId)}
        onOpenChange={(open) => !open && setDeletingMessageId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this message? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingMessageId(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMessage}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
