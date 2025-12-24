import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { DailyReward } from "../types";
import {
  DATABASE_ID,
  DAILY_REWARDS_COLLECTION,
  mapDailyReward,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const dailyRewardService = {
  async getAll(): Promise<DailyReward[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(
        dbId,
        DAILY_REWARDS_COLLECTION
      );
      return response.documents.map(mapDailyReward);
    } catch (error: any) {
      // Silently handle collection not found - collection may not exist yet
      // Check multiple error indicators
      const isCollectionNotFound =
        error?.code === 404 ||
        error?.status === 404 ||
        error?.type === "collection_not_found" ||
        error?.message?.includes("could not be found");

      if (isCollectionNotFound) {
        // Completely silent for collection not found
        return [];
      }

      console.warn("Failed to fetch daily rewards from database:", error);
      return [];
    }
  },

  async getByUserId(userId: string): Promise<DailyReward | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(
        dbId,
        DAILY_REWARDS_COLLECTION,
        [Query.equal("userId", userId)]
      );
      if (response.documents.length === 0) return null;
      return mapDailyReward(response.documents[0]);
    } catch (error: any) {
      // Silently handle collection not found - collection may not exist yet
      if (
        error?.code === 404 ||
        error?.type === "collection_not_found" ||
        error?.message?.includes("could not be found")
      ) {
        return null;
      }
      console.warn(
        "Failed to fetch daily reward for user from database:",
        error
      );
      return null;
    }
  },

  async getById(id: string): Promise<DailyReward | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.getDocument(
        dbId,
        DAILY_REWARDS_COLLECTION,
        id
      );
      return mapDailyReward(response);
    } catch (error: any) {
      // Silently handle collection not found - collection may not exist yet
      if (
        error?.code === 404 ||
        error?.type === "collection_not_found" ||
        error?.message?.includes("could not be found")
      ) {
        return null;
      }
      console.warn("Failed to fetch daily reward from database:", error);
      return null;
    }
  },

  async create(dailyReward: Creatable<DailyReward>): Promise<DailyReward> {
    try {
      const documentId = dailyReward.id ?? ID.unique();
      const { id: _ignored, ...data } = dailyReward as any;
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.createDocument(
        dbId,
        DAILY_REWARDS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapDailyReward(response);
    } catch (error: any) {
      // Handle collection not found error gracefully
      if (
        error?.code === 404 ||
        error?.message?.includes("could not be found")
      ) {
        console.error(
          "Daily rewards collection not found. Please create it in Appwrite.",
          error
        );
      }
      console.error("Failed to create daily reward in database:", error);
      throw error;
    }
  },

  async update(
    id: string,
    updates: Partial<DailyReward>
  ): Promise<DailyReward> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.updateDocument(
        dbId,
        DAILY_REWARDS_COLLECTION,
        id,
        normalizePayload(updates)
      );
      return mapDailyReward(response);
    } catch (error) {
      console.error("Failed to update daily reward in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      await databases.deleteDocument(dbId, DAILY_REWARDS_COLLECTION, id);
    } catch (error) {
      console.error("Failed to delete daily reward from database:", error);
      throw error;
    }
  },
};
