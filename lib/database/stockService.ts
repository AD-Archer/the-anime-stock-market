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
import { metadataService } from "./metadataService";
import { trackPlausible } from "../analytics";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const stockService = {
  /**
   * Count all stocks by paginating through the collection. Useful when the
   * Appwrite `total` value is unexpectedly lower than the real count.
   */
  async countAllStocksByPagination(): Promise<number> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const limit = 100;
      let offset = 0;
      let total = 0;

      while (true) {
        const response = await databases.listDocuments(
          dbId,
          STOCKS_COLLECTION,
          [Query.limit(limit), Query.offset(offset)]
        );
        total += response.documents.length;
        if (response.documents.length < limit) break;
        offset += limit;
      }

      return total;
    } catch (error) {
      console.warn("Failed to count stocks via pagination:", error);
      return 0;
    }
  },

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
      // Assign a sequential character number if not provided
      const characterNumber =
        data.characterNumber ??
        (await metadataService.nextCharacterNumber());

      const response = await databases.createDocument(
        dbId,
        STOCKS_COLLECTION,
        documentId,
        normalizePayload({ ...data, characterNumber })
      );

      // Increment the stock count in metadata
      try {
        await metadataService.incrementStockCount(1);
      } catch (metadataError) {
        console.warn("Failed to update stock count metadata:", metadataError);
        // Don't fail the creation if metadata update fails
      }
      trackPlausible("character_created");

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

      // Decrement the stock count in metadata
      try {
        await metadataService.decrementStockCount(1);
      } catch (metadataError) {
        console.warn("Failed to update stock count metadata:", metadataError);
        // Don't fail the deletion if metadata update fails
      }
      trackPlausible("character_deleted");
    } catch (error) {
      console.warn("Failed to delete stock from database:", error);
      throw error;
    }
  },

  /**
   * Get the total count of stocks from metadata (fast O(1) operation)
   * @param forceActualCount If true, counts all documents instead of using metadata
   */
  async getCount(forceActualCount = false): Promise<number> {
    if (forceActualCount) {
      // Force actual count by querying all documents (pagination to be resilient)
      const total = await this.countAllStocksByPagination();
      if (total > 0) return total;
      // fallback to Appwrite reported total if pagination fails
      try {
        const dbId = ensureDatabaseIdAvailable();
        const response = await databases.listDocuments(
          dbId,
          STOCKS_COLLECTION,
          [Query.limit(1)]
        );
        return response.total;
      } catch (error) {
        console.warn("Failed to get actual stock count:", error);
        return 0;
      }
    }

    try {
      return await metadataService.getStockCount();
    } catch (error) {
      console.warn("Failed to get stock count from metadata:", error);
      // Fallback to counting all documents (expensive but works)
      const total = await this.countAllStocksByPagination();
      if (total > 0) return total;
      console.warn("Fallback count also failed");
      return 0;
    }
  },

  /**
   * Initialize or update the stock count in metadata
   * @param count The count to set (if not provided, counts all documents)
   */
  async initializeCount(count?: number): Promise<void> {
    try {
      const actualCount =
        count !== undefined ? count : (await this.getAll()).length;
      await metadataService.setStockCount(actualCount);
      console.log(`Initialized stock count metadata: ${actualCount}`);
    } catch (error) {
      console.error("Failed to initialize stock count:", error);
      throw error;
    }
  },
};
