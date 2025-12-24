import { ID } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { Friend } from "../types";
import {
  DATABASE_ID,
  FRIENDS_COLLECTION,
  mapFriend,
  normalizePayload,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const friendService = {
  async getAll(): Promise<Friend[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        FRIENDS_COLLECTION
      );
      return response.documents.map(mapFriend);
    } catch (error) {
      console.warn("Failed to fetch friends from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Friend | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        FRIENDS_COLLECTION,
        id
      );
      return mapFriend(response);
    } catch (error) {
      console.warn("Failed to fetch friend record:", error);
      return null;
    }
  },

  async create(record: Creatable<Friend>): Promise<Friend> {
    try {
      const documentId = record.id ?? ID.unique();
      const { id: _ignored, ...data } = record as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        FRIENDS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapFriend(response);
    } catch (error) {
      console.warn("Failed to create friend record:", error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Friend>): Promise<Friend> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        FRIENDS_COLLECTION,
        id,
        normalizePayload(updates)
      );
      return mapFriend(response);
    } catch (error) {
      console.warn("Failed to update friend record:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, FRIENDS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete friend record:", error);
      throw error;
    }
  },
};
