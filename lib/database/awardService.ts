import { ID } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { Award } from "../types";
import {
  DATABASE_ID,
  AWARDS_COLLECTION,
  mapAward,
  normalizePayload,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const awardService = {
  async getAll(): Promise<Award[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        AWARDS_COLLECTION
      );
      return response.documents.map(mapAward);
    } catch (error) {
      console.warn("Failed to fetch awards from database:", error);
      return [];
    }
  },

  async getByUserId(userId: string): Promise<Award[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        AWARDS_COLLECTION,
        [`userId=${userId}`]
      );
      return response.documents.map(mapAward);
    } catch (error) {
      console.warn("Failed to fetch awards for user from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Award | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        AWARDS_COLLECTION,
        id
      );
      return mapAward(response);
    } catch (error) {
      console.warn("Failed to fetch award from database:", error);
      return null;
    }
  },

  async create(award: Creatable<Award>): Promise<Award> {
    try {
      const documentId = award.id ?? ID.unique();
      const { id: _ignored, ...data } = award as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        AWARDS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapAward(response);
    } catch (error) {
      console.error("Failed to create award in database:", error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Award>): Promise<Award> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        AWARDS_COLLECTION,
        id,
        normalizePayload(updates)
      );
      return mapAward(response);
    } catch (error) {
      console.error("Failed to update award in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, AWARDS_COLLECTION, id);
    } catch (error) {
      console.error("Failed to delete award from database:", error);
      throw error;
    }
  },
};