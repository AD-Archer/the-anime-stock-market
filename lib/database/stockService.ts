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
import { buildStockIndexNowUrls, publishIndexNow } from "../indexnow";
import { generateAnimeSlug } from "../utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };
export type StockBrowseSort =
  | "most_active"
  | "trending"
  | "price_desc"
  | "price_asc"
  | "rarest"
  | "newest";

type StockBrowsePageParams = {
  limit?: number;
  offset?: number;
  sort?: StockBrowseSort;
};

type StockSearchParams = {
  query?: string;
  animeSlug?: string;
  limit?: number;
};

const STOCK_INDEXNOW_FIELDS: Array<keyof Stock> = [
  "characterName",
  "characterSlug",
  "anime",
  "description",
  "imageUrl",
  "animeImageUrl",
];

function shouldPublishStockUpdate(previous: Stock, next: Stock): boolean {
  return STOCK_INDEXNOW_FIELDS.some((field) => previous[field] !== next[field]);
}

function publishStockUrls(urls: string[]) {
  if (urls.length === 0) return;
  publishIndexNow(urls).catch((error) => {
    console.warn("Failed to publish stock URLs to IndexNow:", error);
  });
}

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
      const limit = 100;
      let offset = 0;
      const allDocuments: any[] = [];

      while (true) {
        const response = await databases.listDocuments(
          dbId,
          STOCKS_COLLECTION,
          [Query.limit(limit), Query.offset(offset)]
        );

        allDocuments.push(...response.documents);

        if (response.documents.length < limit) {
          break;
        }

        offset += limit;
      }

      // Server-side logging to aid debugging when frontend shows no stocks
      if (typeof window === "undefined") {
        try {
          const sample = allDocuments.slice(0, 5).map((d: any) => d.$id);
        } catch (err) {
          console.warn(
            "[stockService.getAll] Failed to log response summary:",
            err
          );
        }
      }

      return allDocuments.map(mapStock);
    } catch (error) {
      console.warn("Failed to fetch stocks from database:", error);
      return [];
    }
  },

  async getBrowsePage({
    limit = 24,
    offset = 0,
    sort = "newest",
  }: StockBrowsePageParams = {}): Promise<{
    items: Stock[];
    hasMore: boolean;
    nextOffset: number;
  }> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const safeLimit = Math.max(1, Math.min(limit, 50));
      const safeOffset = Math.max(0, offset);
      const queries = [Query.limit(safeLimit + 1), Query.offset(safeOffset)];

      if (sort === "price_desc") {
        queries.push(Query.orderDesc("currentPrice"));
      } else if (sort === "price_asc") {
        queries.push(Query.orderAsc("currentPrice"));
      } else if (sort === "rarest") {
        queries.push(Query.orderAsc("availableShares"));
      } else {
        queries.push(Query.orderDesc("createdAt"));
      }

      const response = await databases.listDocuments(
        dbId,
        STOCKS_COLLECTION,
        queries
      );
      const mapped = response.documents.map(mapStock);
      const hasMore = mapped.length > safeLimit;
      const items = hasMore ? mapped.slice(0, safeLimit) : mapped;

      return {
        items,
        hasMore,
        nextOffset: safeOffset + items.length,
      };
    } catch (error) {
      console.warn("Failed to fetch paginated stocks:", error);
      return { items: [], hasMore: false, nextOffset: offset };
    }
  },

  async search({
    query,
    animeSlug,
    limit = 50,
  }: StockSearchParams = {}): Promise<Stock[]> {
    const normalizedQuery = query?.trim().toLowerCase() ?? "";
    const normalizedAnimeSlug = animeSlug
      ? generateAnimeSlug(animeSlug)
      : undefined;
    const safeLimit = Math.max(1, Math.min(limit, 200));

    const matches = (stock: Stock) => {
      const animeMatches = normalizedAnimeSlug
        ? generateAnimeSlug(stock.anime) === normalizedAnimeSlug
        : true;
      if (!animeMatches) return false;
      if (!normalizedQuery) return true;
      return [stock.characterName, stock.characterSlug, stock.anime]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    };

    // Best effort: try indexed fulltext search first for much faster lookups.
    // If indexes are missing, fall back to bounded pagination scan.
    if (normalizedQuery) {
      try {
        const dbId = ensureDatabaseIdAvailable();
        const [nameRes, animeRes] = await Promise.all([
          databases.listDocuments(dbId, STOCKS_COLLECTION, [
            Query.search("characterName", normalizedQuery),
            Query.limit(safeLimit),
          ]),
          databases.listDocuments(dbId, STOCKS_COLLECTION, [
            Query.search("anime", normalizedQuery),
            Query.limit(safeLimit),
          ]),
        ]);

        const deduped = new Map<string, Stock>();
        [...nameRes.documents, ...animeRes.documents]
          .map(mapStock)
          .forEach((stock) => {
            if (matches(stock)) deduped.set(stock.id, stock);
          });
        const results = Array.from(deduped.values());
        if (results.length > 0) return results.slice(0, safeLimit);
      } catch {
        // Ignore and fall back to pagination scan.
      }
    }

    try {
      const dbId = ensureDatabaseIdAvailable();
      const pageSize = 100;
      const maxScan = 20000;
      let offset = 0;
      let scanned = 0;
      const results: Stock[] = [];

      while (results.length < safeLimit && scanned < maxScan) {
        const response = await databases.listDocuments(dbId, STOCKS_COLLECTION, [
          Query.orderDesc("createdAt"),
          Query.limit(pageSize),
          Query.offset(offset),
        ]);
        const page = response.documents.map(mapStock);
        for (const stock of page) {
          if (matches(stock)) {
            results.push(stock);
            if (results.length >= safeLimit) break;
          }
        }
        scanned += response.documents.length;
        if (response.documents.length < pageSize) break;
        offset += pageSize;
      }

      return results;
    } catch (error) {
      console.warn("Failed to search stocks:", error);
      return [];
    }
  },

  async getTickerStocks(limit = 12): Promise<Stock[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const safeLimit = Math.max(1, Math.min(limit, 100));
      const response = await databases.listDocuments(dbId, STOCKS_COLLECTION, [
        Query.orderDesc("currentPrice"),
        Query.limit(safeLimit),
      ]);
      return response.documents.map(mapStock);
    } catch (error) {
      console.warn("Failed to fetch ticker stocks from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Stock | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.getDocument(dbId, STOCKS_COLLECTION, id);

      if (typeof window === "undefined") {
        try {
          // Logging removed for production
        } catch (err) {
          console.warn(
            "[stockService.getById] Failed to log response summary:",
            err
          );
        }
      }

      return mapStock(response);
    } catch (error) {
      if ((error as any)?.code !== 404) {
        console.warn("Failed to fetch stock from database:", error);
      }
      return null;
    }
  },

  async getByCharacterSlug(slug: string): Promise<Stock | null> {
    try {
      const trimmed = slug.trim();
      if (!trimmed) return null;
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(dbId, STOCKS_COLLECTION, [
        Query.equal("characterSlug", trimmed),
        Query.limit(1),
      ]);
      if (response.documents.length === 0) return null;
      return mapStock(response.documents[0]);
    } catch (error) {
      console.warn("Failed to fetch stock by characterSlug:", error);
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
        data.characterNumber ?? (await metadataService.nextCharacterNumber());

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

      const saved = mapStock(response);
      publishStockUrls(buildStockIndexNowUrls(saved));
      return saved;
    } catch (error) {
      console.warn("Failed to create stock in database:", error);
      throw error;
    }
  },

  async update(id: string, stock: Partial<Stock>): Promise<Stock> {
    try {
      const previous = await this.getById(id);
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.updateDocument(
        dbId,
        STOCKS_COLLECTION,
        id,
        normalizePayload(stock)
      );
      const saved = mapStock(response);

      if (previous && shouldPublishStockUpdate(previous, saved)) {
        publishStockUrls([
          ...buildStockIndexNowUrls(previous),
          ...buildStockIndexNowUrls(saved),
        ]);
      }

      return saved;
    } catch (error) {
      console.warn("Failed to update stock in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const existing = await this.getById(id);
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

      if (existing) {
        publishStockUrls(buildStockIndexNowUrls(existing));
      }
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
    } catch (error) {
      console.error("Failed to initialize stock count:", error);
      throw error;
    }
  },
};
