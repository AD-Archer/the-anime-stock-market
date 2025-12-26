import { Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import { ensureDatabaseIdAvailable } from "./utils";
import { TRANSACTION_ACTIVITY_COLLECTION } from "./utils";
import { stockService } from "./stockService";
import { generateAnimeSlug } from "@/lib/utils";

export const activityService = {
  /**
   * Increment or decrement the transaction count for an anime (derived from a stock)
   * delta may be positive or negative
   */
  async adjustCountForStock(stockId: string, delta = 1) {
    try {
      const stock = await stockService.getById(stockId);
      if (!stock || !stock.anime) return;

      const slug = generateAnimeSlug(stock.anime);
      const dbId = ensureDatabaseIdAvailable();

      // See if an activity doc exists for this anime slug
      const existingRes = await databases.listDocuments(
        dbId,
        TRANSACTION_ACTIVITY_COLLECTION,
        [Query.equal("slug", slug), Query.limit(1)]
      );

      if (existingRes.documents.length) {
        const doc = existingRes.documents[0];
        const current = (doc as any).count ?? 0;
        const updated = Math.max(0, current + delta);
        await databases.updateDocument(
          dbId,
          TRANSACTION_ACTIVITY_COLLECTION,
          doc.$id,
          {
            anime: stock.anime,
            slug,
            count: updated,
          }
        );
      } else if (delta > 0) {
        // Create a new counter document
        await databases.createDocument(
          dbId,
          TRANSACTION_ACTIVITY_COLLECTION,
          "unique::" + slug,
          {
            anime: stock.anime,
            slug,
            count: delta,
          }
        );
      }
    } catch (error) {
      // non-fatal - activity counts are best-effort
      console.warn("Failed to adjust activity count:", error);
    }
  },

  /**
   * Get top anime activity ordered by count (desc)
   */
  async getTopAnimeActivity(limit = 50) {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const res = await databases.listDocuments(
        dbId,
        TRANSACTION_ACTIVITY_COLLECTION,
        [Query.orderDesc("count"), Query.limit(limit)]
      );

      return res.documents.map((d: any) => ({
        anime: d.anime,
        slug: d.slug,
        count: d.count ?? 0,
      }));
    } catch (error) {
      console.warn("Failed to load top anime activity:", error);
      return [];
    }
  },
};
