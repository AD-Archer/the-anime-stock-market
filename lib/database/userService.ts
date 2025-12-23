import { ID } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { User } from "../types";
import {
  DATABASE_ID,
  USERS_COLLECTION,
  mapUser,
  normalizePayload,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const userService = {
  async getAll(): Promise<User[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION
      );
      return response.documents.map(mapUser);
    } catch (error) {
      console.warn("Failed to fetch users from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<User | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        USERS_COLLECTION,
        id
      );
      return mapUser(response);
    } catch (error) {
      console.warn("Failed to fetch user from database:", error);
      return null;
    }
  },

  async create(user: Creatable<User>): Promise<User> {
    try {
      const documentId = user.id ?? ID.unique();
      const { id: _ignored, ...data } = user as any;
      const response = await databases.createDocument(
        DATABASE_ID,
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
      const { id: _ignored, ...data } = user as any;
      const response = await databases.updateDocument(
        DATABASE_ID,
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
      await databases.deleteDocument(DATABASE_ID, USERS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete user from database:", error);
      throw error;
    }
  },
};
