"use client";

import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  Search,
  Plus,
  User as UserIcon,
} from "lucide-react";
import type { Message, Conversation } from "@/lib/types";

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    currentUser,
    users,
    messages,
    conversations,
    sendMessage,
    getConversationMessages,
    getUserConversations,
    createConversation,
    markMessagesAsRead,
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
      newMessage.trim()
    );
    if (message) {
      setNewMessage("");
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
                          href={`/users/${otherUserId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0"
                        >
                          <Avatar className="h-10 w-10 hover:opacity-80 transition-opacity">
                            <AvatarFallback>
                              {otherUser?.username.slice(0, 2).toUpperCase() ||
                                "??"}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <Link
                              href={`/users/${otherUserId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium truncate hover:underline"
                            >
                              {otherUser?.username || "Unknown User"}
                            </Link>
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
                  <AvatarFallback>
                    {otherParticipant.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link href={`/users/${otherParticipant.id}`}>
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
                    conversationMessages.map((message) => {
                      const isFromMe = message.senderId === currentUser.id;

                      return (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${
                            isFromMe ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isFromMe && (
                            <Link href={`/users/${message.senderId}`}>
                              <Avatar className="h-8 w-8 hover:opacity-80 transition-opacity cursor-pointer">
                                <AvatarFallback className="text-xs">
                                  {otherParticipant.username
                                    .slice(0, 2)
                                    .toUpperCase()}
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
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {message.createdAt.toLocaleTimeString()}
                            </p>
                          </div>
                          {isFromMe && (
                            <Link href={`/users/${currentUser.id}`}>
                              <Avatar className="h-8 w-8 hover:opacity-80 transition-opacity cursor-pointer">
                                <AvatarFallback className="text-xs">
                                  {currentUser.username
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex gap-2 p-4 border-t">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
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
    </div>
  );
}
