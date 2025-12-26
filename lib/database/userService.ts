import { ID } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { User } from "../types";
import {
  DATABASE_ID,
  USERS_COLLECTION,
  mapUser,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";
import { Query } from "appwrite";
import { metadataService } from "./metadataService";
import { trackPlausible } from "../analytics";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const userService = {
  async getAll(): Promise<User[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(dbId, USERS_COLLECTION);
      return response.documents.map(mapUser);
    } catch (error) {
      console.warn("Failed to fetch users from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<User | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.getDocument(dbId, USERS_COLLECTION, id);
      return mapUser(response);
    } catch (error) {
      console.warn("Failed to fetch user from database:", error);
      return null;
    }
  },

  async getByEmail(email: string): Promise<User | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(dbId, USERS_COLLECTION, [
        Query.equal("email", email),
      ]);
      if (!response.documents.length) return null;
      return mapUser(response.documents[0]);
    } catch (error) {
      console.warn("Failed to fetch user by email from database:", error);
      return null;
    }
  },

  async create(user: Creatable<User>): Promise<User> {
    try {
      const documentId = user.id ?? ID.unique();
      const { id: _ignored, ...data } = user as any;
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.createDocument(
        dbId,
        USERS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      // Update metadata counter but don't fail creation if it throws
      try {
        await metadataService.incrementUserCount(1);
      } catch (error) {
        console.warn("Failed to update user count metadata:", error);
      }
      trackPlausible("user_created");
      return mapUser(response);
    } catch (error) {
      console.warn("Failed to create user in database:", error);
      throw error;
    }
  },

  async update(id: string, user: Partial<User>): Promise<User> {
    try {
      // Fetch current user to merge with updates, ensuring all required attributes are provided
      const current = await this.getById(id);
      if (!current) throw new Error("User not found");
      const previousBalance = current.balance ?? 0;

      const merged = { ...current, ...user };
      const { id: _ignored, ...data } = merged as any;
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.updateDocument(
        dbId,
        USERS_COLLECTION,
        id,
        normalizePayload(data)
      );
      const saved = mapUser(response);

      // Track volume whenever a balance changes (absolute delta)
      const newBalance = merged.balance ?? previousBalance;
      const balanceDelta = Number.isFinite(newBalance - previousBalance)
        ? newBalance - previousBalance
        : 0;
      if (balanceDelta !== 0) {
        try {
          await metadataService.addToTotalVolume(balanceDelta);
        } catch (error) {
          console.warn("Failed to update total volume metadata:", error);
        }
        trackPlausible("balance_delta", {
          delta: Math.abs(balanceDelta),
          direction: balanceDelta > 0 ? "gain" : "loss",
        });
      }

      return saved;
    } catch (error) {
      console.warn("Failed to update user in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      await databases.deleteDocument(dbId, USERS_COLLECTION, id);
      try {
        await metadataService.decrementUserCount(1);
      } catch (error) {
        console.warn("Failed to decrement user count metadata:", error);
      }
      trackPlausible("user_deleted");
    } catch (error) {
      console.warn("Failed to delete user from database:", error);
      throw error;
    }
  },

  /**
   * Get total user count directly from the database (not cached)
   */
  async getCount(): Promise<number> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(dbId, USERS_COLLECTION, [
        Query.limit(1),
      ]);
      return response.total;
    } catch (error) {
      console.warn("Failed to get user count:", error);
      return 0;
    }
  },
};
