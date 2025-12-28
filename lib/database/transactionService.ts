import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { Transaction } from "../types";
import {
  DATABASE_ID,
  TRANSACTIONS_COLLECTION,
  mapTransaction,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";
import { activityService } from "./activityService";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const transactionService = {
  async getAll(): Promise<Transaction[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const allTransactions: Transaction[] = [];
      let offset = 0;
      const limit = 100; // Appwrite max limit is 100

      while (true) {
        const response = await databases.listDocuments(
          dbId,
          TRANSACTIONS_COLLECTION,
          [Query.limit(limit), Query.offset(offset)]
        );
        const mapped = response.documents.map(mapTransaction);
        allTransactions.push(...mapped);

        if (response.documents.length < limit) break;
        offset += limit;
      }

      return allTransactions;
    } catch (error) {
      console.warn("Failed to fetch transactions from database:", error);
      return [];
    }
  },

  async getRecent(limit = 200): Promise<Transaction[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const safeLimit = Math.max(1, Math.min(limit, 500));
      const transactions: Transaction[] = [];
      let offset = 0;
      const pageSize = 100;

      while (transactions.length < safeLimit) {
        const response = await databases.listDocuments(
          dbId,
          TRANSACTIONS_COLLECTION,
          [
            Query.orderDesc("timestamp"),
            Query.limit(Math.min(pageSize, safeLimit - transactions.length)),
            Query.offset(offset),
          ]
        );
        transactions.push(...response.documents.map(mapTransaction));
        if (response.documents.length < pageSize) break;
        offset += pageSize;
      }

      return transactions.slice(0, safeLimit);
    } catch (error) {
      console.warn("Failed to fetch recent transactions:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Transaction | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.getDocument(
        dbId,
        TRANSACTIONS_COLLECTION,
        id
      );
      return mapTransaction(response);
    } catch (error) {
      console.warn("Failed to fetch transaction from database:", error);
      return null;
    }
  },

  async create(transaction: Creatable<Transaction>): Promise<Transaction> {
    try {
      const documentId = transaction.id ?? ID.unique();
      const {
        id: _ignored,
        isAnonymous: _omitAnon,
        ...data
      } = transaction as any;
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.createDocument(
        dbId,
        TRANSACTIONS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      const created = mapTransaction(response);

      // Update activity counter (best-effort)
      if (created.stockId) {
        activityService.adjustCountForStock(created.stockId, 1).catch(() => {
          /* ignore */
        });
      }

      return created;
    } catch (error) {
      console.warn("Failed to create transaction in database:", error);
      throw error;
    }
  },

  async update(
    id: string,
    transaction: Partial<Transaction>
  ): Promise<Transaction> {
    try {
      const dbId = ensureDatabaseIdAvailable();

      // Get previous transaction to detect stockId changes
      const prev = await this.getById(id);

      const response = await databases.updateDocument(
        dbId,
        TRANSACTIONS_COLLECTION,
        id,
        normalizePayload(transaction)
      );
      const updated = mapTransaction(response);

      // If stockId changed, adjust counts
      if (prev && prev.stockId !== updated.stockId) {
        if (prev.stockId) {
          activityService.adjustCountForStock(prev.stockId, -1).catch(() => {});
        }
        if (updated.stockId) {
          activityService
            .adjustCountForStock(updated.stockId, 1)
            .catch(() => {});
        }
      }

      return updated;
    } catch (error) {
      console.warn("Failed to update transaction in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const dbId = ensureDatabaseIdAvailable();

      // Fetch the transaction so we can decrement the activity counter
      const prev = await this.getById(id);
      if (prev && prev.stockId) {
        activityService.adjustCountForStock(prev.stockId, -1).catch(() => {});
      }

      await databases.deleteDocument(dbId, TRANSACTIONS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete transaction from database:", error);
      throw error;
    }
  },
};
