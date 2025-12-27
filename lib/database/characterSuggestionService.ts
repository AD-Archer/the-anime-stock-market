import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { CharacterSuggestion } from "../types";
import {
  CHARACTER_SUGGESTIONS_COLLECTION,
  ensureDatabaseIdAvailable,
  mapCharacterSuggestion,
  normalizePayload,
} from "./utils";

export const characterSuggestionService = {
  async list(filters?: {
    status?: CharacterSuggestion["status"] | "all";
  }): Promise<CharacterSuggestion[]> {
    try {
      const queries = [];
      if (filters?.status && filters.status !== "all") {
        queries.push(Query.equal("status", filters.status));
      }
      queries.push(Query.orderDesc("$createdAt"));
      const dbId = ensureDatabaseIdAvailable();
      const res = await databases.listDocuments(
        dbId,
        CHARACTER_SUGGESTIONS_COLLECTION,
        queries
      );
      return res.documents.map(mapCharacterSuggestion);
    } catch (error) {
      console.warn("Failed to list character suggestions:", error);
      return [];
    }
  },

  async create(
    suggestion: Omit<CharacterSuggestion, "id" | "createdAt" | "reviewedAt">
  ): Promise<CharacterSuggestion> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const docId = ID.unique();
      const payload = normalizePayload({
        ...suggestion,
        status: suggestion.status || "pending",
        createdAt: new Date(),
        autoImportStatus: suggestion.autoImportStatus || "not_requested",
      });

      const res = await databases.createDocument(
        dbId,
        CHARACTER_SUGGESTIONS_COLLECTION,
        docId,
        payload
      );
      return mapCharacterSuggestion(res);
    } catch (error) {
      console.warn(
        "Falling back to local character suggestion (collection missing?):",
        error
      );
      return {
        id: `local-suggestion-${Date.now()}`,
        userId: suggestion.userId,
        characterName: suggestion.characterName,
        anime: suggestion.anime,
        description: suggestion.description,
        anilistUrl: suggestion.anilistUrl,
        anilistCharacterId: suggestion.anilistCharacterId,
        priority: suggestion.priority ?? false,
        status: suggestion.status || "pending",
        createdAt: new Date(),
        reviewedAt: undefined,
        reviewedBy: undefined,
        resolutionNotes: undefined,
        stockId: suggestion.stockId,
        autoImportStatus: suggestion.autoImportStatus || "not_requested",
        autoImportMessage: suggestion.autoImportMessage,
      };
    }
  },

  async update(
    id: string,
    updates: Partial<CharacterSuggestion>
  ): Promise<CharacterSuggestion> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const payload = normalizePayload(updates as any);
      const res = await databases.updateDocument(
        dbId,
        CHARACTER_SUGGESTIONS_COLLECTION,
        id,
        payload
      );
      return mapCharacterSuggestion(res);
    } catch (error) {
      console.warn(
        "Falling back to local suggestion update (collection missing?):",
        error
      );
      return {
        id,
        characterName: (updates as any).characterName || "Unknown character",
        anime: (updates as any).anime || "Unknown anime",
        userId: updates.userId,
        description: updates.description,
        anilistUrl: updates.anilistUrl,
        anilistCharacterId: updates.anilistCharacterId,
        priority: updates.priority ?? false,
        status: updates.status || "pending",
        createdAt: (updates as any).createdAt || new Date(),
        reviewedAt: updates.reviewedAt,
        reviewedBy: updates.reviewedBy,
        resolutionNotes: updates.resolutionNotes,
        stockId: updates.stockId,
        autoImportStatus: updates.autoImportStatus || "not_requested",
        autoImportMessage: updates.autoImportMessage,
      };
    }
  },
};
