import { ID } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { BuybackOffer } from "../types";
import {
  DATABASE_ID,
  BUYBACK_OFFERS_COLLECTION,
  mapBuybackOffer,
  normalizePayload,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const buybackOfferService = {
  async getAll(): Promise<BuybackOffer[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        BUYBACK_OFFERS_COLLECTION
      );
      return response.documents.map(mapBuybackOffer);
    } catch (error) {
      console.warn("Failed to fetch buyback offers from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<BuybackOffer | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        BUYBACK_OFFERS_COLLECTION,
        id
      );
      return mapBuybackOffer(response);
    } catch (error) {
      console.warn("Failed to fetch buyback offer from database:", error);
      return null;
    }
  },

  async create(buybackOffer: Creatable<BuybackOffer>): Promise<BuybackOffer> {
    try {
      const documentId = buybackOffer.id ?? ID.unique();
      const { id: _ignored, ...data } = buybackOffer as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        BUYBACK_OFFERS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapBuybackOffer(response);
    } catch (error) {
      console.warn("Failed to create buyback offer in database:", error);
      throw error;
    }
  },

  async update(
    id: string,
    buybackOffer: Partial<BuybackOffer>
  ): Promise<BuybackOffer> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        BUYBACK_OFFERS_COLLECTION,
        id,
        normalizePayload(buybackOffer)
      );
      return mapBuybackOffer(response);
    } catch (error) {
      console.warn("Failed to update buyback offer in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        BUYBACK_OFFERS_COLLECTION,
        id
      );
    } catch (error) {
      console.warn("Failed to delete buyback offer from database:", error);
      throw error;
    }
  },
};
