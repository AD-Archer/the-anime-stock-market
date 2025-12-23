import { databases } from "../appwrite";
import type { Portfolio } from "../types";
import {
  DATABASE_ID,
  PORTFOLIOS_COLLECTION,
  mapPortfolio,
  normalizePayload,
} from "./utils";

export const portfolioService = {
  async getAll(): Promise<Portfolio[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
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
      const response = await databases.getDocument(
        DATABASE_ID,
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
      const response = await databases.createDocument(
        DATABASE_ID,
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
      const response = await databases.updateDocument(
        DATABASE_ID,
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
      await databases.deleteDocument(DATABASE_ID, PORTFOLIOS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete portfolio from database:", error);
      throw error;
    }
  },
};
