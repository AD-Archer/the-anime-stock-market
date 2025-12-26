import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import { DATABASE_ID, METADATA_COLLECTION } from "./utils";

const METADATA_KEYS = {
  stockCount: "stock_count",
  characterCount: "character_count",
  userCount: "user_count",
  totalVolume: "total_volume",
  characterSequence: "character_sequence",
} as const;

export interface MetadataDocument {
  id: string;
  key: string;
  value: number;
  updatedAt: Date;
}

type CreatableMetadata = Omit<MetadataDocument, "id" | "updatedAt">;

/**
 * Metadata service for storing counters and other frequently accessed data
 */
export const metadataService = {
  /**
   * Get a metadata value by key
   */
  async get(key: string): Promise<number | null> {
    try {
      const dbId = DATABASE_ID;
      const response = await databases.listDocuments(
        dbId,
        METADATA_COLLECTION,
        [Query.equal("key", key), Query.limit(1)]
      );

      if (response.documents.length === 0) {
        return null;
      }

      return response.documents[0].value as number;
    } catch (error) {
      console.warn(`Failed to get metadata for key "${key}":`, error);
      return null;
    }
  },

  /**
   * Set a metadata value by key
   */
  async set(key: string, value: number): Promise<void> {
    try {
      const dbId = DATABASE_ID;

      // Try to update existing document
      const existing = await databases.listDocuments(
        dbId,
        METADATA_COLLECTION,
        [Query.equal("key", key), Query.limit(1)]
      );

      if (existing.documents.length > 0) {
        await databases.updateDocument(
          dbId,
          METADATA_COLLECTION,
          existing.documents[0].$id,
          {
            value,
            updatedAt: new Date().toISOString(),
          }
        );
      } else {
        // Create new document
        await databases.createDocument(dbId, METADATA_COLLECTION, ID.unique(), {
          key,
          value,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`Failed to set metadata for key "${key}":`, error);
      throw error;
    }
  },

  /**
   * Increment a metadata value by key
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const dbId = DATABASE_ID;

      // Get current value
      const existing = await databases.listDocuments(
        dbId,
        METADATA_COLLECTION,
        [Query.equal("key", key), Query.limit(1)]
      );

      let newValue: number;
      let documentId: string;

      if (existing.documents.length > 0) {
        const currentValue = existing.documents[0].value as number;
        newValue = currentValue + amount;
        documentId = existing.documents[0].$id;

        await databases.updateDocument(dbId, METADATA_COLLECTION, documentId, {
          value: newValue,
          updatedAt: new Date().toISOString(),
        });
      } else {
        newValue = amount;
        await databases.createDocument(dbId, METADATA_COLLECTION, ID.unique(), {
          key,
          value: newValue,
          updatedAt: new Date().toISOString(),
        });
      }

      return newValue;
    } catch (error) {
      console.error(`Failed to increment metadata for key "${key}":`, error);
      throw error;
    }
  },

  /**
   * Decrement a metadata value by key
   */
  async decrement(key: string, amount: number = 1): Promise<number> {
    return this.increment(key, -amount);
  },

  /**
   * Get the stock count
   */
  async getStockCount(): Promise<number> {
    // Prefer the stock count key, fall back to the character alias
    const count =
      (await this.get(METADATA_KEYS.stockCount)) ??
      (await this.get(METADATA_KEYS.characterCount));
    return count || 0;
  },

  /**
   * Set the stock count
   */
  async setStockCount(count: number): Promise<void> {
    await Promise.all([
      this.set(METADATA_KEYS.stockCount, count),
      this.set(METADATA_KEYS.characterCount, count),
    ]);
  },

  /**
   * Increment the stock count
   */
  async incrementStockCount(amount: number = 1): Promise<number> {
    const [newCount] = await Promise.all([
      this.increment(METADATA_KEYS.stockCount, amount),
      this.increment(METADATA_KEYS.characterCount, amount),
    ]);
    return newCount;
  },

  /**
   * Decrement the stock count
   */
  async decrementStockCount(amount: number = 1): Promise<number> {
    return this.incrementStockCount(-amount);
  },

  /**
   * Get the character count (alias for stock count)
   */
  async getCharacterCount(): Promise<number> {
    return this.getStockCount();
  },

  /**
   * Get the total user count
   */
  async getUserCount(): Promise<number> {
    const count = await this.get(METADATA_KEYS.userCount);
    return count || 0;
  },

  /**
   * Set the total user count
   */
  async setUserCount(count: number): Promise<void> {
    await this.set(METADATA_KEYS.userCount, count);
  },

  /**
   * Increment the total user count
   */
  async incrementUserCount(amount: number = 1): Promise<number> {
    return this.increment(METADATA_KEYS.userCount, amount);
  },

  /**
   * Decrement the total user count
   */
  async decrementUserCount(amount: number = 1): Promise<number> {
    return this.decrement(METADATA_KEYS.userCount, amount);
  },

  /**
   * Get the running total volume (absolute dollars moved)
   */
  async getTotalVolume(): Promise<number> {
    const volume = await this.get(METADATA_KEYS.totalVolume);
    return volume || 0;
  },

  /**
   * Set the total volume explicitly
   */
  async setTotalVolume(amount: number): Promise<void> {
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    await this.set(METADATA_KEYS.totalVolume, safeAmount);
  },

  /**
   * Increment total volume by an absolute amount
   */
  async addToTotalVolume(amount: number): Promise<number> {
    const delta = Math.abs(Number(amount));
    if (!Number.isFinite(delta) || delta === 0) {
      return this.getTotalVolume();
    }
    return this.increment(METADATA_KEYS.totalVolume, delta);
  },

  /**
   * Get the next sequential character number.
   */
  async nextCharacterNumber(): Promise<number> {
    try {
      return await this.increment(METADATA_KEYS.characterSequence, 1);
    } catch (error) {
      console.warn("Failed to increment character sequence:", error);
      return 0;
    }
  },

  /**
   * Set the current character sequence explicitly (e.g., after backfill)
   */
  async setCharacterSequence(value: number): Promise<void> {
    await this.set(METADATA_KEYS.characterSequence, value);
  },
};
