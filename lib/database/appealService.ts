import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { Appeal, AppealStatus } from "../types";
import {
  DATABASE_ID,
  APPEALS_COLLECTION,
  mapAppeal,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";

export const appealService = {
  async getAll(): Promise<Appeal[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(dbId, APPEALS_COLLECTION, [
        Query.orderDesc("createdAt"),
        Query.limit(500),
      ]);
      return response.documents.map(mapAppeal);
    } catch (error) {
      console.warn("Failed to load appeals", error);
      return [];
    }
  },

  async create(input: { userId: string; message: string }): Promise<Appeal> {
    const payload = normalizePayload({
      userId: input.userId,
      message: input.message,
      status: "pending" satisfies AppealStatus,
      createdAt: new Date(),
    });

    const dbId = ensureDatabaseIdAvailable();
    const doc = await databases.createDocument(
      dbId,
      APPEALS_COLLECTION,
      ID.unique(),
      payload
    );
    return mapAppeal(doc);
  },

  async update(
    id: string,
    updates: Partial<
      Pick<Appeal, "status" | "resolvedAt" | "resolvedBy" | "resolutionNotes">
    >
  ): Promise<Appeal> {
    const dbId = ensureDatabaseIdAvailable();
    const doc = await databases.updateDocument(
      dbId,
      APPEALS_COLLECTION,
      id,
      normalizePayload(updates)
    );
    return mapAppeal(doc);
  },
};
