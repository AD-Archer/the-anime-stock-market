import { ID } from "appwrite";
import { databases } from "../appwrite";
import type { Stock } from "../types";
import {
  DATABASE_ID,
  STOCKS_COLLECTION,
  mapStock,
  normalizePayload,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const stockService = {
  async getAll(): Promise<Stock[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        STOCKS_COLLECTION
      );
      return response.documents.map(mapStock);
    } catch (error) {
      console.warn("Failed to fetch stocks from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Stock | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        STOCKS_COLLECTION,
        id
      );
      return mapStock(response);
    } catch (error) {
      console.warn("Failed to fetch stock from database:", error);
      return null;
    }
  },

  async create(stock: Creatable<Stock>): Promise<Stock> {
    try {
      const documentId = stock.id ?? ID.unique();
      const { id: _ignored, ...data } = stock as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        STOCKS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapStock(response);
    } catch (error) {
      console.warn("Failed to create stock in database:", error);
      throw error;
    }
  },

  async update(id: string, stock: Partial<Stock>): Promise<Stock> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        STOCKS_COLLECTION,
        id,
        normalizePayload(stock)
      );
      return mapStock(response);
    } catch (error) {
      console.warn("Failed to update stock in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, STOCKS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete stock from database:", error);
      throw error;
    }
  },
};