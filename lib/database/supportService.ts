import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { SupportTicket, SupportTicketMessage } from "../types";
import { DATABASE_ID, ensureDatabaseIdAvailable } from "./utils";
import {
  SUPPORTS_COLLECTION,
  normalizePayload,
  mapSupportTicket,
} from "./utils";
import { sendSystemEvent } from "../system-events-client";

export const supportService = {
  async create(ticket: Omit<SupportTicket, "id" | "createdAt" | "updatedAt">) {
    try {
      const id = ID.unique();
      const obj: any = {
        ...ticket,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // If messages are present, serialize them to JSON string (Appwrite stores as string)
      if (obj.messages) {
        try {
          const msgs = (obj.messages as any[]).map((m) => ({
            ...m,
            createdAt: m?.createdAt
              ? m.createdAt instanceof Date
                ? m.createdAt.toISOString()
                : m.createdAt
              : new Date().toISOString(),
          }));
          let s = JSON.stringify(msgs);
          if (s.length > 20000) {
            console.warn(
              "Support ticket messages exceed storage limit: truncating"
            );
            s = s.slice(0, 19990) + "...";
          }
          obj.messages = s;
        } catch (e) {
          console.warn(
            "Failed to serialize messages, dropping messages field",
            e
          );
          delete obj.messages;
        }
      }

      const payload = normalizePayload(obj);
      const dbId = ensureDatabaseIdAvailable();
      const res = await databases.createDocument(
        dbId,
        SUPPORTS_COLLECTION,
        id,
        payload
      );
      // Notify system that a new support ticket was created (best-effort)
      try {
        // Include a short message snippet and the submitter's contact email if present
        await sendSystemEvent({
          type: "support_ticket_created",
          // userId only present when user was signed in
          userId: ticket.userId ?? undefined,
          metadata: {
            id: res.$id,
            subject: ticket.subject,
            contactEmail: (ticket as any).contactEmail ?? (ticket as any).email,
            tag: (ticket as any).tag,
            referenceId: (ticket as any).referenceId,
            messageSnippet: (ticket.message ?? "").slice(0, 400),
          },
        } as any);
      } catch (e) {
        console.warn("Failed to send support ticket system event", e);
      }
      return mapSupportTicket(res);
    } catch (error) {
      console.warn("Failed to create support ticket:", error);
      throw error;
    }
  },

  async list(filters?: {
    status?: string;
    searchQuery?: string;
    tag?: string;
  }): Promise<any[]> {
    try {
      const queries = [];
      if (filters?.status) {
        queries.push(Query.equal("status", filters.status));
      }
      if (filters?.searchQuery) {
        queries.push(Query.search("subject", filters.searchQuery));
        queries.push(Query.search("message", filters.searchQuery));
      }
      if (filters?.tag) {
        queries.push(Query.equal("tag", filters.tag));
      }
      const dbId = ensureDatabaseIdAvailable();
      const res = await databases.listDocuments(
        dbId,
        SUPPORTS_COLLECTION,
        queries
      );
      return res.documents.map((d) => mapSupportTicket(d));
    } catch (error) {
      console.warn("Failed to list support tickets:", error);
      return [];
    }
  },

  async getById(id: string) {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const res = await databases.getDocument(dbId, SUPPORTS_COLLECTION, id);
      return mapSupportTicket(res);
    } catch (error) {
      console.warn("Failed to fetch support ticket:", error);
      return null;
    }
  },

  async update(id: string, updates: Partial<SupportTicket>) {
    try {
      const merged: any = { ...updates, updatedAt: new Date().toISOString() };

      if (merged.messages) {
        try {
          const msgs = (merged.messages as any[]).map((m) => ({
            ...m,
            createdAt: m?.createdAt
              ? m.createdAt instanceof Date
                ? m.createdAt.toISOString()
                : m.createdAt
              : new Date().toISOString(),
          }));
          let s = JSON.stringify(msgs);
          if (s.length > 20000) {
            console.warn(
              "Support ticket messages exceed storage limit: truncating"
            );
            s = s.slice(0, 19990) + "...";
          }
          merged.messages = s;
        } catch (e) {
          console.warn(
            "Failed to serialize messages for update, dropping messages field",
            e
          );
          delete merged.messages;
        }
      }

      const payload = normalizePayload(merged as any);
      const dbId = ensureDatabaseIdAvailable();
      const res = await databases.updateDocument(
        dbId,
        SUPPORTS_COLLECTION,
        id,
        payload
      );
      return mapSupportTicket(res);
    } catch (error) {
      console.warn("Failed to update support ticket:", error);
      throw error;
    }
  },

  async addFollowUp(ticketId: string, message: string, senderId?: string) {
    try {
      const ticket = await this.getById(ticketId);
      if (!ticket) {
        throw new Error("Ticket not found");
      }
      const newMessage: SupportTicketMessage = {
        text: message,
        createdAt: new Date(),
        senderId,
      };
      const updatedMessages = [...(ticket.messages || []), newMessage];
      return await this.update(ticketId, {
        messages: updatedMessages,
        status: "open",
      });
    } catch (error) {
      console.warn("Failed to add follow-up to support ticket:", error);
      throw error;
    }
  },
};
