import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { PremiumAddition } from "../types";
import {
  ensureDatabaseIdAvailable,
  PREMIUM_ADDITIONS_COLLECTION,
  mapPremiumAddition,
  normalizePayload,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const premiumAdditionService = {
  async listByUser(
    userId: string,
    limit = 20
  ): Promise<PremiumAddition[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(
        dbId,
        PREMIUM_ADDITIONS_COLLECTION,
        [Query.equal("userId", userId), Query.orderDesc("createdAt"), Query.limit(limit)]
      );
      return response.documents.map(mapPremiumAddition);
    } catch (error: any) {
      if (
        error?.code === 404 ||
        error?.type === "collection_not_found" ||
        error?.message?.includes("could not be found")
      ) {
        return [];
      }
      console.warn("Failed to fetch premium additions from database:", error);
      return [];
    }
  },

  async create(
    addition: Creatable<PremiumAddition>
  ): Promise<PremiumAddition> {
    const documentId = addition.id ?? ID.unique();
    const { id: _ignored, ...data } = addition as any;
    const dbId = ensureDatabaseIdAvailable();
    const response = await databases.createDocument(
      dbId,
      PREMIUM_ADDITIONS_COLLECTION,
      documentId,
      normalizePayload(data)
    );
    return mapPremiumAddition(response);
  },

  async createMany(
    additions: Creatable<PremiumAddition>[]
  ): Promise<PremiumAddition[]> {
    const created: PremiumAddition[] = [];
    for (const addition of additions) {
      try {
        created.push(await this.create(addition));
      } catch (error) {
        console.warn("Failed to create premium addition record:", error);
      }
    }
    return created;
  },
};
