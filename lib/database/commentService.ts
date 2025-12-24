import { ID } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { Comment } from "../types";
import {
  DATABASE_ID,
  COMMENTS_COLLECTION,
  mapComment,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

const serializeCommentPayload = (comment: Partial<Comment>) => {
  const payload: Record<string, unknown> = {};

  Object.entries(comment as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined) return;
    payload[key] = value;
  });

  return payload;
};

export const commentService = {
  async getAll(): Promise<Comment[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(dbId, COMMENTS_COLLECTION);
      return response.documents.map(mapComment);
    } catch (error) {
      console.warn("Failed to fetch comments from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Comment | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.getDocument(
        dbId,
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
      const payload = serializeCommentPayload(data);
      const normalizedData = normalizePayload(payload);
      // Filter out undefined values as Appwrite doesn't allow them
      const filteredData = Object.fromEntries(
        Object.entries(normalizedData).filter(
          ([_, value]) => value !== undefined
        )
      );
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.createDocument(
        dbId,
        COMMENTS_COLLECTION,
        documentId,
        filteredData
      );
      return mapComment(response);
    } catch (error) {
      console.warn("Failed to create comment in database:", error);
      throw error;
    }
  },

  async update(id: string, comment: Partial<Comment>): Promise<Comment> {
    try {
      const payload = serializeCommentPayload(comment);
      const normalizedData = normalizePayload(payload);
      // Filter out undefined values as Appwrite doesn't allow them
      const filteredData = Object.fromEntries(
        Object.entries(normalizedData).filter(
          ([_, value]) => value !== undefined
        )
      );
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.updateDocument(
        dbId,
        COMMENTS_COLLECTION,
        id,
        filteredData
      );
      return mapComment(response);
    } catch (error) {
      console.warn("Failed to update comment in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      await databases.deleteDocument(dbId, COMMENTS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete comment from database:", error);
      throw error;
    }
  },
};
