import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import { DATABASE_ID, METADATA_COLLECTION } from "./utils";

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
    const count = await this.get("stock_count");
    return count || 0;
  },

  /**
   * Set the stock count
   */
  async setStockCount(count: number): Promise<void> {
    await this.set("stock_count", count);
  },

  /**
   * Increment the stock count
   */
  async incrementStockCount(amount: number = 1): Promise<number> {
    return this.increment("stock_count", amount);
  },

  /**
   * Decrement the stock count
   */
  async decrementStockCount(amount: number = 1): Promise<number> {
    return this.decrement("stock_count", amount);
  },
};
