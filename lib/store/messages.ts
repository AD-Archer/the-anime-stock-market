import type { StoreApi } from "zustand";
import type { Conversation, Message } from "../types";
import { messageService } from "../database";
import type { StoreState } from "./types";

type StoreMutators = Pick<StoreApi<StoreState>, "setState" | "getState">;

export function createMessageActions({
  setState,
  getState,
}: StoreMutators) {
  const sendMessage = async (
    conversationId: string,
    content: string
  ): Promise<Message | null> => {
    const currentUser = getState().currentUser;
    if (!currentUser) return null;

    try {
      const message = await messageService.create({
        conversationId,
        senderId: currentUser.id,
        content,
      });

      setState((state) => ({
        messages: [...state.messages, message],
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                lastMessage: {
                  content,
                  senderId: currentUser.id,
                  timestamp: message.createdAt,
                },
                updatedAt: message.createdAt,
              }
            : conv
        ),
      }));

      // Unlock social_butterfly once the user has sent messages in 10 distinct conversations.
      const state = getState();
      const alreadyUnlocked = state.awards.some(
        (a) => a.userId === currentUser.id && a.type === "social_butterfly"
      );
      if (!alreadyUnlocked) {
        const conversationIds = new Set(
          state.messages
            .filter((m) => m.senderId === currentUser.id)
            .map((m) => m.conversationId)
        );
        if (conversationIds.size >= 10) {
          state.unlockAward(currentUser.id, "social_butterfly").catch(() => {});
        }
      }

      return message;
    } catch (error) {
      console.error("Failed to send message:", error);
      return null;
    }
  };

  const getConversationMessages = async (
    conversationId: string
  ): Promise<Message[]> => {
    try {
      const fetchedMessages = await messageService.getConversationMessages(
        conversationId
      );
      setState((state) => {
        const existingIds = new Set(state.messages.map((m) => m.id));
        const newMessages = fetchedMessages.filter((m) => !existingIds.has(m.id));
        return { messages: [...state.messages, ...newMessages] };
      });
      return fetchedMessages;
    } catch (error) {
      console.error("Failed to get conversation messages:", error);
      return [];
    }
  };

  const getUserConversations = async (
    userId: string
  ): Promise<Conversation[]> => {
    try {
      const fetchedConversations = await messageService.getUserConversations(
        userId
      );
      setState({ conversations: fetchedConversations });
      return fetchedConversations;
    } catch (error) {
      console.error("Failed to get user conversations:", error);
      return [];
    }
  };

  const createConversation = (participantIds: string[]): string => {
    const sortedIds = [...participantIds].sort();
    const conversationId = sortedIds.join("-");

    const existingConversation = getState().conversations.find(
      (c) => c.id === conversationId
    );
    if (existingConversation) {
      return conversationId;
    }

    const newConversation: Conversation = {
      id: conversationId,
      participants: sortedIds,
      lastMessage: {
        content: "",
        senderId: "",
        timestamp: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setState((state) => ({
      conversations: [...state.conversations, newConversation],
    }));
    return conversationId;
  };

  const markMessagesAsRead = async (
    conversationId: string,
    userId: string
  ) => {
    try {
      const conversationMessages = getState().messages.filter(
        (m) => m.conversationId === conversationId
      );
      const unreadMessageIds = conversationMessages
        .filter((m) => !m.readBy.includes(userId))
        .map((m) => m.id);

      if (unreadMessageIds.length > 0) {
        await messageService.markAsRead(unreadMessageIds, userId);

        setState((state) => ({
          messages: state.messages.map((message) =>
            message.conversationId === conversationId &&
            !message.readBy.includes(userId)
              ? { ...message, readBy: [...message.readBy, userId] }
              : message
          ),
        }));
      }
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  return {
    sendMessage,
    getConversationMessages,
    getUserConversations,
    createConversation,
    markMessagesAsRead,
  };
}
