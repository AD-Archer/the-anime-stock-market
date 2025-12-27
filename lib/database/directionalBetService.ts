import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { DirectionalBet } from "../types";
import {
  DATABASE_ID,
  DIRECTIONAL_BETS_COLLECTION,
  mapDirectionalBet,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const directionalBetService = {
  async getAll(): Promise<DirectionalBet[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const allBets: DirectionalBet[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const response = await databases.listDocuments(
          dbId,
          DIRECTIONAL_BETS_COLLECTION,
          [Query.limit(limit), Query.offset(offset)]
        );

        const mapped = response.documents.map(mapDirectionalBet);
        allBets.push(...mapped);

        if (response.documents.length < limit) break;
        offset += limit;
      }

      return allBets;
    } catch (error) {
      console.warn("Failed to fetch directional bets from database:", error);
      return [];
    }
  },

  async create(bet: Creatable<DirectionalBet>): Promise<DirectionalBet> {
    try {
      const documentId = bet.id ?? ID.unique();
      const { id: _ignored, ...data } = bet;
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.createDocument(
        dbId,
        DIRECTIONAL_BETS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapDirectionalBet(response);
    } catch (error) {
      console.warn("Failed to create directional bet:", error);
      throw error;
    }
  },
};
