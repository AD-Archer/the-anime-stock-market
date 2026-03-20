import { databases } from "../appwrite/appwrite";
import type { Portfolio } from "../types";
import {
  PORTFOLIOS_COLLECTION,
  mapPortfolio,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";
import { generateShortId } from "../utils";
import { Query } from "appwrite";

const PAGE_SIZE = 100;

const listPortfoliosPage = async (
  dbId: string,
  queries: any[] = []
): Promise<any[]> => {
  const documents: any[] = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(dbId, PORTFOLIOS_COLLECTION, [
      ...queries,
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
    ]);
    documents.push(...response.documents);
    if (response.documents.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return documents;
};

export const portfolioService = {
  async getAll(): Promise<Portfolio[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const documents = await listPortfoliosPage(dbId);
      return documents.map(mapPortfolio);
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

  async getByUserAndStock(
    userId: string,
    stockId: string
  ): Promise<Portfolio | null> {
    try {
      const matches = await this.getAllByUserAndStock(userId, stockId);
      if (matches.length === 0) return null;
      return matches[0];
    } catch (error) {
      console.warn("Failed to fetch portfolio from database:", error);
      return null;
    }
  },

  async getAllByUserAndStock(
    userId: string,
    stockId: string
  ): Promise<Portfolio[]> {
    const dbId = ensureDatabaseIdAvailable();

    try {
      const documents = await listPortfoliosPage(dbId, [
        Query.equal("userId", userId),
        Query.equal("stockId", stockId),
      ]);
      return documents.map(mapPortfolio);
    } catch (error) {
      // Some Appwrite environments reject attribute queries when indexes are missing.
      // Fallback to a bounded full scan so trading can still reconcile holdings.
      console.warn(
        "Indexed portfolio lookup failed, falling back to scan:",
        error
      );
    }

    try {
      const documents = await listPortfoliosPage(dbId);
      return documents
        .filter(
          (doc) =>
            String((doc as any).userId ?? "") === userId &&
            String((doc as any).stockId ?? "") === stockId
        )
        .map(mapPortfolio);
    } catch (error) {
      console.warn("Failed to fetch portfolios by user and stock:", error);
      return [];
    }
  },

  async create(portfolio: Portfolio): Promise<Portfolio> {
    try {
      const documentId = portfolio.id || generateShortId();
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.createDocument(
        dbId,
        PORTFOLIOS_COLLECTION,
        documentId,
        normalizePayload({
          userId: portfolio.userId,
          stockId: portfolio.stockId,
          shares: portfolio.shares,
          averageBuyPrice: portfolio.averageBuyPrice,
        })
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
