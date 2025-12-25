import { NextRequest, NextResponse } from "next/server";
import { databases } from "@/lib/appwrite/appwrite";
import { stockService, userService } from "@/lib/database";
import type { Stock } from "@/lib/types";
import type { AppwriteDocument } from "@/lib/database/utils";

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const STOCKS_COLLECTION = process.env.APPWRITE_STOCKS_COLLECTION;

/**
 * Admin endpoint to clean up duplicate stocks
 * Consolidates all media IDs for the same character into one stock
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Missing user ID" },
        { status: 401 }
      );
    }

    // Verify user is admin
    const userDoc = await userService.getById(userId);
    if (!userDoc || !userDoc.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (!DATABASE_ID || !STOCKS_COLLECTION) {
      return NextResponse.json(
        { error: "Database configuration error" },
        { status: 500 }
      );
    }

    console.log("Starting duplicate stock cleanup...");
    const response = await databases.listDocuments(
      DATABASE_ID,
      STOCKS_COLLECTION,
      []
    );

    // Group stocks by character ID
    const stocksByCharacterId = new Map<number, Stock[]>();
    for (const doc of response.documents) {
      const stock = doc as unknown as Stock;
      const characterId = stock.anilistCharacterId;
      if (!stocksByCharacterId.has(characterId)) {
        stocksByCharacterId.set(characterId, []);
      }
      stocksByCharacterId.get(characterId)!.push(stock);
    }

    console.log(
      `Found ${response.documents.length} total stocks, ${stocksByCharacterId.size} unique characters`
    );

    let deletedCount = 0;
    let consolidatedCount = 0;
    const deletedStocks: string[] = [];

    // Process each character
    for (const [characterId, stocks] of stocksByCharacterId.entries()) {
      if (stocks.length > 1) {
        console.log(
          `Character ${characterId} (${stocks[0].characterName}) has ${stocks.length} duplicate stocks`
        );

        // Keep the first stock and consolidate all media IDs
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
            deletedStocks.push(duplicateStock.id);
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

    return NextResponse.json({
      success: true,
      summary: {
        totalStocksBefore: response.documents.length,
        uniqueCharacters: stocksByCharacterId.size,
        consolidatedCount,
        deletedCount,
        deletedStocks,
      },
      message: `Cleaned up ${deletedCount} duplicate stocks. ${stocksByCharacterId.size} unique character stocks now exist.`,
    });
  } catch (error) {
    console.error("Error in cleanup endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to cleanup duplicate stocks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
