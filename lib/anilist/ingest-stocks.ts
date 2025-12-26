/**
 * Stock ingestion service for AniList data
 * Handles fetching characters/anime from AniList and adding them as stocks
 */

import {
  fetchMediaWithCharacters,
  fetchCharacter,
  searchCharacters,
} from "./client";
import { generateStockPricing } from "./price-generator";
import {
  createUniqueSlug,
  isSameName,
  normalizeForComparison,
} from "../utils/slug";
import {
  stockService,
  STOCKS_COLLECTION,
  DATABASE_ID,
  adminActionLogService,
} from "../database";
import { databases } from "../appwrite/appwrite";
import { Query } from "appwrite";
import type { Stock } from "../types";

interface CharacterStockData {
  characterName: string;
  characterSlug: string;
  anilistCharacterId: number;
  anilistMediaIds: string[];
  anime: string;
  anilistRank?: number;
  currentPrice: number;
  totalShares: number;
  availableShares: number;
  imageUrl: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

/**
 * Get all existing character slugs from the database
 */
async function getExistingSlugs(): Promise<string[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      STOCKS_COLLECTION,
      []
    );
    return response.documents.map((doc: any) => doc.characterSlug);
  } catch (error) {
    console.warn("Failed to fetch existing slugs:", error);
    return [];
  }
}

/**
 * Find existing stock by character ID and media ID
 */
async function findExistingStock(
  anilistCharacterId: number,
  maybeName?: string
): Promise<Stock | null> {
  try {
    console.log(
      `[findExistingStock] Searching for character ID: ${anilistCharacterId} or name: ${maybeName}`
    );
    const response = await databases.listDocuments(
      DATABASE_ID,
      STOCKS_COLLECTION,
      []
    );
    const stockDoc = response.documents.find((doc: any) => {
      // 1) Exact anilistCharacterId match
      if (
        doc.anilistCharacterId &&
        Number(doc.anilistCharacterId) === anilistCharacterId
      ) {
        return true;
      }

      // 2) If a name is provided, match by normalized name to avoid dupes
      if (
        maybeName &&
        doc.characterName &&
        isSameName(doc.characterName, maybeName)
      ) {
        return true;
      }

      return false;
    });

    if (!stockDoc) {
      console.log(
        `[findExistingStock] No existing stock found for character ID ${anilistCharacterId} or name ${maybeName}`
      );
      return null;
    }

    console.log(
      `[findExistingStock] Found existing stock: ${stockDoc.$id} for character ${stockDoc.characterName}`
    );

    // Map the document to Stock type
    return {
      id: stockDoc.$id,
      characterName: stockDoc.characterName,
      characterSlug: stockDoc.characterSlug,
      anilistCharacterId: stockDoc.anilistCharacterId,
      anilistMediaIds: stockDoc.anilistMediaIds || [],
      anime: stockDoc.anime,
      anilistRank: stockDoc.anilistRank,
      currentPrice: stockDoc.currentPrice,
      totalShares: stockDoc.totalShares,
      availableShares: stockDoc.availableShares,
      imageUrl: stockDoc.imageUrl,
      description: stockDoc.description,
      createdBy: stockDoc.createdBy,
      createdAt: new Date(stockDoc.createdAt),
    } as Stock;
  } catch (error) {
    console.warn("Failed to find existing stock:", error);
    return null;
  }
}

async function deleteWithBackoff(id: string, maxAttempts = 5) {
  let attempt = 0;
  let backoff = 500;
  while (attempt < maxAttempts) {
    try {
      await stockService.delete(id);
      return;
    } catch (err: any) {
      attempt++;
      const code = err?.code ?? err?.status ?? null;
      if (code === 429 && attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, backoff));
        backoff = Math.min(backoff * 2, 5000);
        continue;
      }
      throw err;
    }
  }
}

async function mergeDuplicatesByCharacter(
  anilistCharacterId: number,
  maybeName?: string
) {
  if (!DATABASE_ID) return;
  try {
    const queries = [Query.equal("anilistCharacterId", anilistCharacterId)];
    let docs = (
      await databases.listDocuments(DATABASE_ID, STOCKS_COLLECTION, queries)
    ).documents;

    // fallback to name-based matching if no ID hits
    if (docs.length <= 1 && maybeName) {
      const allDocs = await databases.listDocuments(
        DATABASE_ID,
        STOCKS_COLLECTION,
        [Query.limit(100)]
      );
      docs = allDocs.documents.filter(
        (doc: any) =>
          doc.characterName &&
          isSameName(String(doc.characterName), String(maybeName))
      );
    }

    if (docs.length <= 1) return;

    const stocks: Stock[] = docs.map((doc: any) => ({
      id: doc.$id,
      characterName: doc.characterName,
      characterSlug: doc.characterSlug,
      anilistCharacterId: Number(doc.anilistCharacterId),
      anilistMediaIds: doc.anilistMediaIds || [],
      anime: doc.anime,
      anilistRank: doc.anilistRank,
      currentPrice: doc.currentPrice,
      totalShares: doc.totalShares,
      availableShares: doc.availableShares,
      imageUrl: doc.imageUrl,
      animeImageUrl: doc.animeImageUrl,
      description: doc.description,
      createdBy: doc.createdBy,
      createdAt: new Date(doc.createdAt || doc.$createdAt || Date.now()),
      source: doc.source,
    }));

    const [primary, ...toMerge] = stocks.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    const mergedMedia = Array.from(
      new Set([
        ...(primary.anilistMediaIds || []),
        ...toMerge.flatMap((t) => t.anilistMediaIds || []),
      ])
    );
    const imageUrl =
      primary.imageUrl || toMerge.find((t) => t.imageUrl)?.imageUrl;
    const animeImageUrl =
      primary.animeImageUrl ||
      toMerge.find((t) => t.animeImageUrl)?.animeImageUrl;
    const description = [
      primary.description,
      ...toMerge.map((t) => t.description || ""),
    ].sort((a, b) => b.length - a.length)[0];

    try {
      await stockService.update(primary.id, {
        anilistMediaIds: mergedMedia,
        imageUrl,
        animeImageUrl,
        description,
      });
    } catch (err) {
      console.warn(
        `[mergeDuplicatesByCharacter] Failed to update primary ${primary.id}:`,
        err
      );
    }

    for (const duplicate of toMerge) {
      try {
        await deleteWithBackoff(duplicate.id);
      } catch (err) {
        console.warn(
          `[mergeDuplicatesByCharacter] Failed to delete duplicate ${duplicate.id}:`,
          err
        );
      }
    }
  } catch (error) {
    console.warn(
      `[mergeDuplicatesByCharacter] Failed to merge duplicates for ${anilistCharacterId}:`,
      error
    );
  }
}

/**
 * Get all media IDs that contain a character
 */
async function getCharacterMediaIds(characterId: number): Promise<number[]> {
  try {
    const character = await fetchCharacter(characterId);
    return character.media.edges.map((edge) => edge.node.id);
  } catch (error) {
    console.warn(`Failed to fetch character ${characterId} media:`, error);
    return [];
  }
}

/**
 * Add a character as a stock from a specific media
 * Updates description if stock already exists
 */
async function addCharacterStock(
  mediaId: number,
  characterId: number,
  characterName: string,
  mediaTitle: string,
  imageUrl: string | null,
  animeImageUrl: string | null,
  description: string | null,
  anilistRank: number | undefined,
  createdByUserId: string
): Promise<{ added: boolean; id?: string; stock?: Stock; error?: string }> {
  try {
    if (!imageUrl) {
      return {
        added: false,
        error: `No image available for ${characterName}`,
      };
    }

    const existingStock = await findExistingStock(characterId, characterName);

    if (existingStock) {
      console.log(
        `[addCharacterStock] Character already exists: ${characterName} (ID: ${existingStock.id})`
      );
      // Add media ID to existing stock if not already present
      const existingMediaIds = existingStock.anilistMediaIds || [];
      const mediaIdStr = String(mediaId);
      if (!existingMediaIds.includes(mediaIdStr)) {
        console.log(
          `[addCharacterStock] Adding media ID ${mediaId} to existing stock ${existingStock.id}`
        );
        await stockService.update(existingStock.id, {
          anilistMediaIds: [...existingMediaIds, mediaIdStr],
        });
      } else {
        console.log(
          `[addCharacterStock] Media ID ${mediaId} already in stock ${existingStock.id}`
        );
      }

      // Update existing stock if description is different and longer
      const newDescription = description || existingStock.description;
      if (
        newDescription &&
        newDescription.length > (existingStock.description?.length || 0)
      ) {
        console.log(
          `[addCharacterStock] Updating description for stock ${existingStock.id}`
        );
        await stockService.update(existingStock.id, {
          description: newDescription,
        });
      }

      await mergeDuplicatesByCharacter(characterId, characterName);

      return {
        added: false,
        id: existingStock.id,
        stock: existingStock,
      };
    }

    // Create new stock
    console.log(`[addCharacterStock] Creating new stock for ${characterName}`);
    const existingSlugs = await getExistingSlugs();
    const characterSlug = createUniqueSlug(characterName, existingSlugs);
    const pricing = generateStockPricing({ rank: anilistRank });
    const now = new Date();

    const newStock = await stockService.create({
      characterName,
      characterSlug,
      anilistCharacterId: characterId,
      anilistMediaIds: [String(mediaId)],
      anime: mediaTitle,
      anilistRank,
      currentPrice: pricing.currentPrice,
      totalShares: pricing.totalShares,
      availableShares: pricing.availableShares,
      imageUrl,
      animeImageUrl: animeImageUrl || undefined,
      description: description || "No description available",
      createdBy: createdByUserId,
      createdAt: now,
    } as Stock);

    console.log(
      `[addCharacterStock] New stock created: ${newStock.id} for ${characterName}`
    );

    await mergeDuplicatesByCharacter(characterId, characterName);

    return {
      added: true,
      id: newStock.id,
      stock: newStock,
    };
  } catch (error) {
    return {
      added: false,
      error: `Failed to add stock for ${characterName}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Add all characters from an anime as stocks
 */
export async function addAnimeStocks(
  anilistMediaId: number,
  createdByUserId: string,
  filters?: {
    characterNameFilter?: string; // Only add characters with name containing this
    minRoleImportance?: "MAIN" | "SUPPORTING" | "BACKGROUND"; // Minimum role importance
  }
): Promise<{ added: number; updated: number; failed: number; results: any[] }> {
  try {
    const media = await fetchMediaWithCharacters(anilistMediaId);

    if (!media.characters?.edges || media.characters.edges.length === 0) {
      return { added: 0, updated: 0, failed: 0, results: [] };
    }

    const roleImportanceMap = { MAIN: 3, SUPPORTING: 2, BACKGROUND: 1 };
    const minRoleValue = filters?.minRoleImportance
      ? roleImportanceMap[filters.minRoleImportance]
      : 0;

    let added = 0,
      updated = 0,
      failed = 0;
    const results = [];

    for (const edge of media.characters.edges) {
      const roleValue =
        roleImportanceMap[edge.role as keyof typeof roleImportanceMap] || 0;
      if (roleValue < minRoleValue) continue;

      if (
        filters?.characterNameFilter &&
        !edge.node.name.full
          .toLowerCase()
          .includes(filters.characterNameFilter.toLowerCase())
      ) {
        continue;
      }

      const primaryRank = media.rankings?.find(
        (r) => r.allTime && r.type === "RATED"
      )?.rank;

      // Fetch anime image for this media
      let animeImageUrl: string | null = null;
      try {
        const fullMedia = await fetchMediaWithCharacters(media.id);
        animeImageUrl = fullMedia.coverImage?.large || null;
      } catch (e) {
        console.warn(`Failed to fetch anime image for media ${media.id}`);
      }

      const result = await addCharacterStock(
        media.id,
        edge.node.id,
        edge.node.name.full,
        media.title.romaji || media.title.english || "Unknown",
        edge.node.image?.large || null,
        animeImageUrl,
        edge.node.description || null,
        primaryRank,
        createdByUserId
      );

      if (result.added) {
        added++;
      } else if (result.stock) {
        updated++;
      } else if (result.error) {
        failed++;
        console.warn(result.error);
      }

      results.push(result);
    }

    // Log a single admin action for this import
    try {
      await adminActionLogService.create({
        action: "stock_grant",
        performedBy: createdByUserId,
        targetUserId: createdByUserId,
        metadata: {
          type: "anime",
          mediaId: anilistMediaId,
          added,
          updated,
          failed,
          details: results.map((r) => ({
            name: r.stock?.characterName || r.error || "unknown",
            added: r.added || false,
            id: r.id || null,
            error: r.error || null,
          })),
        },
      });
    } catch (err) {
      console.warn("Failed to create admin log for stock import:", err);
    }

    return { added, updated, failed, results };
  } catch (error) {
    console.error("Failed to add anime stocks:", error);
    return { added: 0, updated: 0, failed: 1, results: [] };
  }
}

/**
 * Add a single character as stock across all their appearances
 */
export async function addCharacterStocks(
  anilistCharacterId: number,
  createdByUserId: string
): Promise<{ added: number; updated: number; failed: number; results: any[] }> {
  try {
    console.log(
      `[addCharacterStocks] Starting import for character ${anilistCharacterId}`
    );
    const character = await fetchCharacter(anilistCharacterId);

    if (!character.media?.edges || character.media.edges.length === 0) {
      console.log(`[addCharacterStocks] Character has no media entries`);
      return { added: 0, updated: 0, failed: 0, results: [] };
    }

    console.log(
      `[addCharacterStocks] Found ${character.media.edges.length} media entries for ${character.name.full}`
    );

    let added = 0,
      updated = 0,
      failed = 0;
    const results = [];
    let createdStockId: string | null = null;

    for (const mediaEdge of character.media.edges) {
      // Once we have successfully created/linked a stock, stop creating more
      if (createdStockId) {
        break;
      }

      const media = mediaEdge.node;

      // Fetch full media data to get ranking and image
      let anilistRank: number | undefined;
      let animeImageUrl: string | null = null;
      try {
        const fullMedia = await fetchMediaWithCharacters(media.id);
        anilistRank = fullMedia.rankings?.find(
          (r) => r.allTime && r.type === "RATED"
        )?.rank;
        animeImageUrl = fullMedia.coverImage?.large || null;
      } catch (e) {
        console.warn(`Failed to fetch full media data for ${media.id}`);
      }

      const result = await addCharacterStock(
        media.id,
        anilistCharacterId,
        character.name.full,
        media.title.romaji || media.title.english || "Unknown",
        character.image?.large || null,
        animeImageUrl,
        character.description || null,
        anilistRank,
        createdByUserId
      );

      if (result.added) {
        added++;
        createdStockId = result.id || result.stock?.id || null;
      } else if (result.stock) {
        updated++;
        createdStockId = result.id || result.stock.id;
      } else if (result.error) {
        failed++;
        console.warn(result.error);
      }

      results.push(result);
    }

    console.log(
      `[addCharacterStocks] Complete for ${character.name.full}: Added ${added}, Updated ${updated}, Failed ${failed}`
    );

    // Log a single admin action for this character import
    try {
      await adminActionLogService.create({
        action: "stock_grant",
        performedBy: createdByUserId,
        targetUserId: createdByUserId,
        metadata: {
          type: "character",
          characterId: anilistCharacterId,
          characterName: character.name.full,
          added,
          updated,
          failed,
        },
      });
    } catch (err) {
      console.warn("Failed to create admin log for character import:", err);
    }

    return { added, updated, failed, results };
  } catch (error) {
    console.error("Failed to add character stocks:", error);
    return { added: 0, updated: 0, failed: 1, results: [] };
  }
}

/**
 * Search for a character by name and add all their stocks
 */
export async function searchAndAddCharacterStocks(
  characterName: string,
  createdByUserId: string
): Promise<{
  charactersFound: number;
  totalAdded: number;
  totalUpdated: number;
  totalFailed: number;
  details: any[];
}> {
  try {
    const characters = await searchCharacters(characterName);

    if (characters.length === 0) {
      return {
        charactersFound: 0,
        totalAdded: 0,
        totalUpdated: 0,
        totalFailed: 0,
        details: [],
      };
    }

    let totalAdded = 0,
      totalUpdated = 0,
      totalFailed = 0;
    const details = [];

    for (const character of characters) {
      const result = await addCharacterStocks(character.id, createdByUserId);
      totalAdded += result.added;
      totalUpdated += result.updated;
      totalFailed += result.failed;

      details.push({
        characterId: character.id,
        characterName: character.name.full,
        ...result,
      });
    }

    // Log a single admin action for this search import
    try {
      await adminActionLogService.create({
        action: "stock_grant",
        performedBy: createdByUserId,
        targetUserId: createdByUserId,
        metadata: {
          type: "search",
          query: characterName,
          charactersFound: characters.length,
          totalAdded,
          totalUpdated,
          totalFailed,
        },
      });
    } catch (err) {
      console.warn("Failed to create admin log for search import:", err);
    }

    return {
      charactersFound: characters.length,
      totalAdded,
      totalUpdated,
      totalFailed,
      details,
    };
  } catch (error) {
    console.error("Failed to search and add character stocks:", error);
    return {
      charactersFound: 0,
      totalAdded: 0,
      totalUpdated: 0,
      totalFailed: 1,
      details: [],
    };
  }
}
