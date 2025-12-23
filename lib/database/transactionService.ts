import { ID } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { Transaction } from "../types";
import {
  DATABASE_ID,
  TRANSACTIONS_COLLECTION,
  mapTransaction,
  normalizePayload,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const transactionService = {
  async getAll(): Promise<Transaction[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        TRANSACTIONS_COLLECTION
      );
      return response.documents.map(mapTransaction);
    } catch (error) {
      console.warn("Failed to fetch transactions from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Transaction | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
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
      const { id: _ignored, isAnonymous: _omitAnon, ...data } = transaction as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        TRANSACTIONS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapTransaction(response);
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
      const response = await databases.updateDocument(
        DATABASE_ID,
        TRANSACTIONS_COLLECTION,
        id,
        normalizePayload(transaction)
      );
      return mapTransaction(response);
    } catch (error) {
      console.warn("Failed to update transaction in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, TRANSACTIONS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete transaction from database:", error);
      throw error;
    }
  },
};
