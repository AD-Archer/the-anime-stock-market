import { databases } from "../appwrite/appwrite";
import type { Portfolio } from "../types";
import {
  DATABASE_ID,
  PORTFOLIOS_COLLECTION,
  mapPortfolio,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";

export const portfolioService = {
  async getAll(): Promise<Portfolio[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(
        dbId,
        PORTFOLIOS_COLLECTION
      );
      return response.documents.map(mapPortfolio);
    } catch (error) {
      console.warn("Failed to fetch portfolios from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Portfolio | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.getDocument(
        dbId,
        PORTFOLIOS_COLLECTION,
        id
      );
      return mapPortfolio(response);
    } catch (error) {
      console.warn("Failed to fetch portfolio from database:", error);
      return null;
    }
  },

  async create(portfolio: Portfolio): Promise<Portfolio> {
    try {
      const documentId = `${portfolio.userId}-${portfolio.stockId}`;
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.createDocument(
        dbId,
        PORTFOLIOS_COLLECTION,
        documentId,
        normalizePayload(portfolio)
      );
      return mapPortfolio(response);
    } catch (error) {
      console.warn("Failed to create portfolio in database:", error);
      throw error;
    }
  },

  async update(id: string, portfolio: Partial<Portfolio>): Promise<Portfolio> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.updateDocument(
        dbId,
        PORTFOLIOS_COLLECTION,
        id,
        normalizePayload(portfolio)
      );
      return mapPortfolio(response);
    } catch (error) {
      console.warn("Failed to update portfolio in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      await databases.deleteDocument(dbId, PORTFOLIOS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete portfolio from database:", error);
      throw error;
    }
  },
};
