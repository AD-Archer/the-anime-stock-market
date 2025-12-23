import { ID } from "appwrite";
import { databases } from "../appwrite";
import type { Notification } from "../types";
import {
  DATABASE_ID,
  NOTIFICATIONS_COLLECTION,
  mapNotification,
  normalizePayload,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION
      );
      return response.documents.map(mapNotification);
    } catch (error) {
      console.warn("Failed to fetch notifications from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Notification | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION,
        id
      );
      return mapNotification(response);
    } catch (error) {
      console.warn("Failed to fetch notification from database:", error);
      return null;
    }
  },

  async create(notification: Creatable<Notification>): Promise<Notification> {
    try {
      const documentId = notification.id ?? ID.unique();
      const { id: _ignored, ...data } = notification as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapNotification(response);
    } catch (error) {
      console.warn("Failed to create notification in database:", error);
      throw error;
    }
  },

  async update(
    id: string,
    notification: Partial<Notification>
  ): Promise<Notification> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION,
        id,
        normalizePayload(notification)
      );
      return mapNotification(response);
    } catch (error) {
      console.warn("Failed to update notification in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete notification from database:", error);
      throw error;
    }
  },
};
