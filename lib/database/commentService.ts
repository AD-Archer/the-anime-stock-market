import { ID } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { Comment } from "../types";
import {
  DATABASE_ID,
  COMMENTS_COLLECTION,
  mapComment,
  normalizePayload,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export const commentService = {
  async getAll(): Promise<Comment[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COMMENTS_COLLECTION
      );
      return response.documents.map(mapComment);
    } catch (error) {
      console.warn("Failed to fetch comments from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Comment | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION,
        id
      );
      return mapComment(response);
    } catch (error) {
      console.warn("Failed to fetch comment from database:", error);
      return null;
    }
  },

  async create(comment: Creatable<Comment>): Promise<Comment> {
    try {
      const documentId = comment.id ?? ID.unique();
      const { id: _ignored, ...data } = comment as any;
      const response = await databases.createDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION,
        documentId,
        normalizePayload(data)
      );
      return mapComment(response);
    } catch (error) {
      console.warn("Failed to create comment in database:", error);
      throw error;
    }
  },

  async update(id: string, comment: Partial<Comment>): Promise<Comment> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION,
        id,
        normalizePayload(comment)
      );
      return mapComment(response);
    } catch (error) {
      console.warn("Failed to update comment in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, COMMENTS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete comment from database:", error);
      throw error;
    }
  },
};
