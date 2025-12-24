import { ID } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { User } from "../types";
import {
  DATABASE_ID,
  USERS_COLLECTION,
  mapUser,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";
import { Query } from "appwrite";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const userService = {
  async getAll(): Promise<User[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(dbId, USERS_COLLECTION);
      return response.documents.map(mapUser);
    } catch (error) {
      console.warn("Failed to fetch users from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<User | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.getDocument(dbId, USERS_COLLECTION, id);
      return mapUser(response);
    } catch (error) {
      console.warn("Failed to fetch user from database:", error);
      return null;
    }
  },

  async getByEmail(email: string): Promise<User | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(dbId, USERS_COLLECTION, [
        Query.equal("email", email),
      ]);
      if (!response.documents.length) return null;
      return mapUser(response.documents[0]);
    } catch (error) {
      console.warn("Failed to fetch user by email from database:", error);
      return null;
    }
  },

  async create(user: Creatable<User>): Promise<User> {
    try {
      const documentId = user.id ?? ID.unique();
      const { id: _ignored, ...data } = user as any;
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.createDocument(
        dbId,
        USERS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapUser(response);
    } catch (error) {
      console.warn("Failed to create user in database:", error);
      throw error;
    }
  },

  async update(id: string, user: Partial<User>): Promise<User> {
    try {
      // Fetch current user to merge with updates, ensuring all required attributes are provided
      const current = await this.getById(id);
      if (!current) throw new Error("User not found");

      const merged = { ...current, ...user };
      const { id: _ignored, ...data } = merged as any;
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.updateDocument(
        dbId,
        USERS_COLLECTION,
        id,
        normalizePayload(data)
      );
      return mapUser(response);
    } catch (error) {
      console.warn("Failed to update user in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      await databases.deleteDocument(dbId, USERS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete user from database:", error);
      throw error;
    }
  },
};
