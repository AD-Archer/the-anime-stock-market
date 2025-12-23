import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { Message, Conversation } from "../types";
import {
  DATABASE_ID,
  MESSAGES_COLLECTION,
  mapMessage,
  normalizePayload,
  toArrayOr,
} from "./utils";

export const messageService = {
  // Create a new message
  async create(
    message: Omit<Message, "id" | "createdAt" | "readBy">
  ): Promise<Message> {
    const payload = normalizePayload({
      ...message,
      createdAt: new Date().toISOString(),
      readBy: [message.senderId], // Sender has read their own message
    });

    const doc = await databases.createDocument(
      DATABASE_ID,
      MESSAGES_COLLECTION,
      ID.unique(),
      payload
    );

    return mapMessage(doc);
  },

  // Get messages for a conversation
  async getConversationMessages(conversationId: string): Promise<Message[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      MESSAGES_COLLECTION,
      [
        Query.equal("conversationId", conversationId),
        Query.orderAsc("createdAt"),
      ]
    );

    return response.documents.map(mapMessage);
  },

  // Get all conversations for a user
  async getUserConversations(userId: string): Promise<Conversation[]> {
    // Get all messages (with a higher limit for testing)
    const allMessagesResponse = await databases.listDocuments(
      DATABASE_ID,
      MESSAGES_COLLECTION,
      [
        Query.orderDesc("createdAt"),
        Query.limit(5000), // Higher limit for testing
      ]
    );

    // Group messages by conversationId
    const conversationMap = new Map<string, Message[]>();

    allMessagesResponse.documents.map(mapMessage).forEach((message) => {
      if (!conversationMap.has(message.conversationId)) {
        conversationMap.set(message.conversationId, []);
      }
      conversationMap.get(message.conversationId)!.push(message);
    });

    // Convert to conversations, only including those where user is a participant
    const conversations: Conversation[] = [];
    conversationMap.forEach((messages, conversationId) => {
      // Parse participants from conversation ID
      const participants = conversationId
        .split("-")
        .filter((id) => id && id !== "");

      // Only include if user is a participant
      if (participants.includes(userId)) {
        const sortedMessages = messages.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        const lastMessage = sortedMessages[0];

        conversations.push({
          id: conversationId,
          participants,
          lastMessage: {
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            timestamp: lastMessage.createdAt,
          },
          createdAt: sortedMessages[sortedMessages.length - 1].createdAt,
          updatedAt: lastMessage.createdAt,
        });
      }
    });

    return conversations.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  },

  // Mark messages as read
  async markAsRead(messageIds: string[], userId: string): Promise<void> {
    // This would require updating multiple documents
    // For now, we'll handle this in the frontend by updating read status
    for (const messageId of messageIds) {
      try {
        const message = await databases.getDocument(
          DATABASE_ID,
          MESSAGES_COLLECTION,
          messageId
        );

        const readBy = toArrayOr<string>(message.readBy, []);
        if (!readBy.includes(userId)) {
          await databases.updateDocument(
            DATABASE_ID,
            MESSAGES_COLLECTION,
            messageId,
            {
              readBy: [...readBy, userId],
            }
          );
        }
      } catch (error) {
        console.error(`Failed to mark message ${messageId} as read:`, error);
      }
    }
  },

  // Get unread count for a user
  async getUnreadCount(userId: string): Promise<number> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      MESSAGES_COLLECTION,
      [Query.notEqual("senderId", userId), Query.notContains("readBy", userId)]
    );

    return response.total;
  },
};
