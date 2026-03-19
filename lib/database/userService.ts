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
import { buildUserIndexNowUrls, publishIndexNow } from "../indexnow";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

const USER_INDEXNOW_FIELDS: Array<keyof User> = [
  "displaySlug",
  "username",
  "displayName",
  "avatarUrl",
];

function shouldPublishUserUpdate(previous: User, next: User): boolean {
  return USER_INDEXNOW_FIELDS.some((field) => previous[field] !== next[field]);
}

function publishUserUrls(urls: string[]) {
  if (urls.length === 0) return;
  publishIndexNow(urls).catch((error) => {
    console.warn("Failed to publish user URLs to IndexNow:", error);
  });
}

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
      const saved = mapUser(response);
      publishUserUrls(buildUserIndexNowUrls(saved));
      return saved;
    } catch (error) {
      console.warn("Failed to create user in database:", error);
      throw error;
    }
  },

  async update(id: string, user: Partial<User>): Promise<User> {
    try {
      // Fetch current user for side effects (volume tracking + index updates)
      const current = await this.getById(id);
      if (!current) throw new Error("User not found");
      const previousBalance = current.balance ?? 0;

      // Send only the patch fields to Appwrite.
      // This avoids leaking unsupported attributes from local state into updates.
      const { id: _ignored, ...data } = user as any;
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.updateDocument(
        dbId,
        USERS_COLLECTION,
        id,
        normalizePayload(data)
      );
      const saved = mapUser(response);

      // Track volume whenever a balance changes (absolute delta)
      const newBalance =
        typeof user.balance === "number" ? user.balance : previousBalance;
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

      if (shouldPublishUserUpdate(current, saved)) {
        publishUserUrls([
          ...buildUserIndexNowUrls(current),
          ...buildUserIndexNowUrls(saved),
        ]);
      }

      return saved;
    } catch (error) {
      console.warn("Failed to update user in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const existing = await this.getById(id);
      const dbId = ensureDatabaseIdAvailable();
      await databases.deleteDocument(dbId, USERS_COLLECTION, id);
      try {
        await metadataService.decrementUserCount(1);
      } catch (error) {
        console.warn("Failed to decrement user count metadata:", error);
      }
      trackPlausible("user_deleted");

      if (existing) {
        publishUserUrls(buildUserIndexNowUrls(existing));
      }
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
