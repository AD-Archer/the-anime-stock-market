import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { Award } from "../types";
import {
  DATABASE_ID,
  AWARDS_COLLECTION,
  mapAward,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const awardService = {
  async getAll(): Promise<Award[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const limit = 100;
      let offset = 0;
      const documents: any[] = [];

      while (true) {
        const response = await databases.listDocuments(dbId, AWARDS_COLLECTION, [
          Query.limit(limit),
          Query.offset(offset),
        ]);
        documents.push(...response.documents);
        if (response.documents.length < limit) break;
        offset += limit;
      }

      return documents.map(mapAward);
    } catch (error) {
      console.warn("Failed to fetch awards from database:", error);
      return [];
    }
  },

  async getByUserId(userId: string): Promise<Award[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const limit = 100;
      let offset = 0;
      const documents: any[] = [];

      while (true) {
        const response = await databases.listDocuments(
          dbId,
          AWARDS_COLLECTION,
          [Query.equal("userId", userId), Query.limit(limit), Query.offset(offset)]
        );
        documents.push(...response.documents);
        if (response.documents.length < limit) break;
        offset += limit;
      }

      return documents.map(mapAward);
    } catch (error) {
      console.warn("Failed to fetch awards for user from database:", error);
      return [];
    }
  },

  async getByUserAndType(
    userId: string,
    type: Award["type"]
  ): Promise<Award | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(dbId, AWARDS_COLLECTION, [
        Query.equal("userId", userId),
        Query.equal("type", type),
        Query.limit(1),
      ]);
      if (response.documents.length === 0) return null;
      return mapAward(response.documents[0]);
    } catch (error) {
      console.warn("Failed to fetch award by user and type from database:", error);
      return null;
    }
  },

  async getById(id: string): Promise<Award | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.getDocument(dbId, AWARDS_COLLECTION, id);
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
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.createDocument(
        dbId,
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
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.updateDocument(
        dbId,
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
      const dbId = ensureDatabaseIdAvailable();
      await databases.deleteDocument(dbId, AWARDS_COLLECTION, id);
    } catch (error) {
      console.error("Failed to delete award from database:", error);
      throw error;
    }
  },
};
