import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { PriceHistory } from "../types";
import {
  DATABASE_ID,
  PRICE_HISTORY_COLLECTION,
  mapPriceHistory,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";
import { debugPriceHistory } from "../debug/price-history";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };
const DEBUG_PRICE_HISTORY =
  process.env.NEXT_PUBLIC_DEBUG_PRICE_HISTORY === "1";

// All server/client price changes should persist via this service to keep
// history consistent across refreshes and % change calculations.
export const priceHistoryService = {
  async getAll(): Promise<PriceHistory[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const all: PriceHistory[] = [];
      let offset = 0;
      const limit = 100; // Appwrite max limit is 100

      while (true) {
        const response = await databases.listDocuments(
          dbId,
          PRICE_HISTORY_COLLECTION,
          [Query.limit(limit), Query.offset(offset)]
        );
        all.push(...response.documents.map(mapPriceHistory));
        if (response.documents.length < limit) break;
        offset += limit;
      }

      return all;
    } catch (error) {
      console.warn("Failed to fetch price history from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<PriceHistory | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.getDocument(
        dbId,
        PRICE_HISTORY_COLLECTION,
        id
      );
      return mapPriceHistory(response);
    } catch (error) {
      console.warn("Failed to fetch price history from database:", error);
      return null;
    }
  },

  async getByStockId(stockId: string, limit = 200): Promise<PriceHistory[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const safeLimit = Math.max(1, Math.min(limit, 500));
      const entries: PriceHistory[] = [];
      const pageSize = 100;
      let offset = 0;

      while (entries.length < safeLimit) {
        let response;
        try {
          response = await databases.listDocuments(
            dbId,
            PRICE_HISTORY_COLLECTION,
            [
              Query.equal("stockId", stockId),
              Query.orderDesc("timestamp"),
              Query.limit(Math.min(pageSize, safeLimit - entries.length)),
              Query.offset(offset),
            ]
          );
        } catch (error) {
          response = await databases.listDocuments(
            dbId,
            PRICE_HISTORY_COLLECTION,
            [
              Query.equal("stockId", stockId),
              Query.orderDesc("$createdAt"),
              Query.limit(Math.min(pageSize, safeLimit - entries.length)),
              Query.offset(offset),
            ]
          );
        }
        entries.push(...response.documents.map(mapPriceHistory));
        if (response.documents.length < pageSize) break;
        offset += pageSize;
      }

      if (DEBUG_PRICE_HISTORY) {
        console.info("[price_history.getByStockId]", {
          stockId,
          limit: safeLimit,
          returned: entries.length,
        });
      }
      debugPriceHistory("getByStockId", {
        stockId,
        limit: safeLimit,
        returned: entries.length,
      });

      return entries;
    } catch (error) {
      console.warn(
        "Failed to fetch price history for stock from database:",
        error
      );
      return [];
    }
  },

  async getLatestByStockId(
    stockId: string,
    limit = 2
  ): Promise<PriceHistory[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const safeLimit = Math.max(1, Math.min(limit, 100));
      let response;
      try {
        response = await databases.listDocuments(
          dbId,
          PRICE_HISTORY_COLLECTION,
          [
            Query.equal("stockId", stockId),
            Query.orderDesc("timestamp"),
            Query.limit(safeLimit),
          ]
        );
      } catch (error) {
        response = await databases.listDocuments(
          dbId,
          PRICE_HISTORY_COLLECTION,
          [
            Query.equal("stockId", stockId),
            Query.orderDesc("$createdAt"),
            Query.limit(safeLimit),
          ]
        );
      }
      const mapped = response.documents.map(mapPriceHistory);
      if (DEBUG_PRICE_HISTORY) {
        console.info("[price_history.getLatestByStockId]", {
          stockId,
          limit: safeLimit,
          returned: mapped.length,
        });
      }
      debugPriceHistory("getLatestByStockId", {
        stockId,
        limit: safeLimit,
        returned: mapped.length,
      });
      return mapped;
    } catch (error) {
      console.warn(
        "Failed to fetch latest price history for stock from database:",
        error
      );
      return [];
    }
  },

  async create(priceHistory: Creatable<PriceHistory>): Promise<PriceHistory> {
    try {
      const documentId = priceHistory.id ?? ID.unique();
      const { id: _ignored, ...data } = priceHistory as any;
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.createDocument(
        dbId,
        PRICE_HISTORY_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      const mapped = mapPriceHistory(response);
      if (DEBUG_PRICE_HISTORY) {
        console.info("[price_history.create]", {
          id: mapped.id,
          stockId: mapped.stockId,
          price: mapped.price,
          timestamp: mapped.timestamp.toISOString(),
        });
      }
      debugPriceHistory("create", {
        id: mapped.id,
        stockId: mapped.stockId,
        price: mapped.price,
        timestamp: mapped.timestamp.toISOString(),
      });
      return mapped;
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
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.updateDocument(
        dbId,
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
      const dbId = ensureDatabaseIdAvailable();
      await databases.deleteDocument(dbId, PRICE_HISTORY_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete price history from database:", error);
      throw error;
    }
  },
};
