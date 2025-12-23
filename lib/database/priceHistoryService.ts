import { ID } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { PriceHistory } from "../types";
import {
  DATABASE_ID,
  PRICE_HISTORY_COLLECTION,
  mapPriceHistory,
  normalizePayload,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const priceHistoryService = {
  async getAll(): Promise<PriceHistory[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        PRICE_HISTORY_COLLECTION
      );
      return response.documents.map(mapPriceHistory);
    } catch (error) {
      console.warn("Failed to fetch price history from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<PriceHistory | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        PRICE_HISTORY_COLLECTION,
        id
      );
      return mapPriceHistory(response);
    } catch (error) {
      console.warn("Failed to fetch price history from database:", error);
      return null;
    }
  },

  async create(priceHistory: Creatable<PriceHistory>): Promise<PriceHistory> {
    try {
      const documentId = priceHistory.id ?? ID.unique();
      const { id: _ignored, ...data } = priceHistory as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        PRICE_HISTORY_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapPriceHistory(response);
    } catch (error) {
      console.warn("Failed to create price history in database:", error);
      throw error;
    }
  },

  async update(
    id: string,
    priceHistory: Partial<PriceHistory>
  ): Promise<PriceHistory> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        PRICE_HISTORY_COLLECTION,
        id,
        normalizePayload(priceHistory)
      );
      return mapPriceHistory(response);
    } catch (error) {
      console.warn("Failed to update price history in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, PRICE_HISTORY_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete price history from database:", error);
      throw error;
    }
  },
};
