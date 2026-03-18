import { ID, Query } from "appwrite";
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

export type CommentListScope =
  | {
      kind: "market";
    }
  | {
      kind: "anime";
      animeId: string;
    }
  | {
      kind: "character";
      characterId: string;
    };

export type CommentListPage = {
  comments: Comment[];
  total: number;
};

const serializeCommentPayload = (comment: Partial<Comment>) => {
  const payload: Record<string, unknown> = {};

  Object.entries(comment as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined) return;
    payload[key] = value;
  });

  return payload;
};

export const commentService = {
  async listPage(
    scope: CommentListScope,
    limit = 15,
    offset = 0
  ): Promise<CommentListPage> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const safeLimit = Math.max(1, Math.min(limit, 100));
      const queries = [Query.orderDesc("timestamp"), Query.limit(safeLimit)];

      if (offset > 0) {
        queries.push(Query.offset(offset));
      }

      if (scope.kind === "market") {
        queries.push(Query.isNull("animeId"));
        queries.push(Query.isNull("characterId"));
        queries.push(Query.equal("premiumOnly", false));
      } else if (scope.kind === "anime") {
        queries.push(Query.equal("animeId", scope.animeId));
        queries.push(Query.isNull("characterId"));
      } else {
        queries.push(Query.equal("characterId", scope.characterId));
      }

      const response = await databases.listDocuments(
        dbId,
        COMMENTS_COLLECTION,
        queries
      );

      return {
        comments: response.documents.map(mapComment),
        total: response.total,
      };
    } catch (error) {
      console.warn("Failed to fetch paginated comments from database:", error);
      return { comments: [], total: 0 };
    }
  },

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
