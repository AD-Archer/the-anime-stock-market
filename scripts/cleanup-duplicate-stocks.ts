/**
 * Cleanup script to remove duplicate stocks and consolidate media IDs
 * Keeps one stock per character and combines all media IDs
 */

import { databases } from "@/lib/appwrite/appwrite";
import { stockService } from "@/lib/database";
import type { Stock } from "@/lib/types";
import type { AppwriteDocument } from "@/lib/database/utils";

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const STOCKS_COLLECTION = process.env.APPWRITE_STOCKS_COLLECTION;

async function cleanupDuplicateStocks() {
  if (!DATABASE_ID || !STOCKS_COLLECTION) {
    console.error("Missing environment variables");
    process.exit(1);
  }

  try {
    console.log("Fetching all stocks...");
    const response = await databases.listDocuments(
      DATABASE_ID,
      STOCKS_COLLECTION,
      []
    );

    // Group stocks by character ID (documents are Appwrite documents, not typed Stocks)
    const stocksByCharacterId = new Map<number, Stock[]>();
    for (const doc of response.documents as unknown as Stock[]) {
      const characterId = doc.anilistCharacterId;
      if (!stocksByCharacterId.has(characterId)) {
        stocksByCharacterId.set(characterId, []);
      }
      stocksByCharacterId.get(characterId)!.push(doc);
    }

    console.log(
      `Found ${response.documents.length} total stocks, ${stocksByCharacterId.size} unique characters`
    );

    let deletedCount = 0;
    let consolidatedCount = 0;

    // Process each character
    for (const [characterId, stocks] of stocksByCharacterId.entries()) {
      if (stocks.length > 1) {
        console.log(
          `Character ${characterId} has ${stocks.length} duplicate stocks`
        );

        // Keep the first stock (oldest or best) and consolidate all media IDs
        const primaryStock = stocks[0];
        const allMediaIds = new Set<string>();

        // Collect all media IDs from all stocks
        for (const stock of stocks) {
          if (Array.isArray(stock.anilistMediaIds)) {
            stock.anilistMediaIds.forEach((id: string) => allMediaIds.add(id));
          }
        }

        // Update primary stock with all media IDs
        const consolidatedMediaIds = Array.from(allMediaIds);
        if (
          JSON.stringify(consolidatedMediaIds) !==
          JSON.stringify(primaryStock.anilistMediaIds || [])
        ) {
          console.log(
            `  Updating primary stock ${primaryStock.id} with ${consolidatedMediaIds.length} media IDs`
          );
          await stockService.update(primaryStock.id, {
            anilistMediaIds: consolidatedMediaIds,
          });
          consolidatedCount++;
        }

        // Delete duplicate stocks
        for (let i = 1; i < stocks.length; i++) {
          const duplicateStock = stocks[i];
          console.log(
            `  Deleting duplicate stock ${duplicateStock.id} (${duplicateStock.anime})`
          );
          try {
            await stockService.delete(duplicateStock.id);
            deletedCount++;
          } catch (error) {
            console.error(
              `  Failed to delete ${duplicateStock.id}:`,
              error instanceof Error ? error.message : error
            );
          }
        }
      }
    }

    console.log(`\nCleanup complete!`);
    console.log(`Consolidated: ${consolidatedCount} stocks`);
    console.log(`Deleted: ${deletedCount} duplicate stocks`);
    console.log(`Remaining unique stocks: ${stocksByCharacterId.size}`);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

cleanupDuplicateStocks();
