import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { Stock } from "../types";
import {
  DATABASE_ID,
  STOCKS_COLLECTION,
  mapStock,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const stockService = {
  async getAll(): Promise<Stock[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(dbId, STOCKS_COLLECTION, [
        Query.limit(1000),
      ]);

      // Server-side logging to aid debugging when frontend shows no stocks
      if (typeof window === "undefined") {
        try {
          console.log(
            `[stockService.getAll] Retrieved ${response.documents.length} stock documents from Appwrite (db=${dbId}, collection=${STOCKS_COLLECTION})`
          );
          const sample = response.documents.slice(0, 5).map((d: any) => d.$id);
          console.log("[stockService.getAll] Sample IDs:", sample);
        } catch (err) {
          console.warn(
            "[stockService.getAll] Failed to log response summary:",
            err
          );
        }
      }

      return response.documents.map(mapStock);
    } catch (error) {
      console.warn("Failed to fetch stocks from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Stock | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.getDocument(dbId, STOCKS_COLLECTION, id);

      if (typeof window === "undefined") {
        try {
          console.log(
            `[stockService.getById] Fetched stock id=${id} from db=${dbId}`
          );
          console.log("[stockService.getById] Raw doc sample:", {
            $id: (response as any).$id,
            characterName: (response as any).characterName,
            anilistCharacterId: (response as any).anilistCharacterId,
          });
        } catch (err) {
          console.warn(
            "[stockService.getById] Failed to log response summary:",
            err
          );
        }
      }

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
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.createDocument(
        dbId,
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
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.updateDocument(
        dbId,
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
      const dbId = ensureDatabaseIdAvailable();
      await databases.deleteDocument(dbId, STOCKS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete stock from database:", error);
      throw error;
    }
  },
};
