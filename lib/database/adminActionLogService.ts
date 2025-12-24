import { ID, Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { AdminActionLog } from "../types";
import {
  DATABASE_ID,
  ADMIN_ACTION_LOGS_COLLECTION,
  mapAdminActionLog,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";

const encodeMetadata = (value?: Record<string, unknown>) => {
  if (!value || Object.keys(value).length === 0) {
    return undefined;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
};

export const adminActionLogService = {
  async getAll(): Promise<AdminActionLog[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(
        dbId,
        ADMIN_ACTION_LOGS_COLLECTION,
        [Query.orderDesc("createdAt"), Query.limit(500)]
      );
      return response.documents.map(mapAdminActionLog);
    } catch (error) {
      console.warn("Failed to load admin action logs", error);
      return [];
    }
  },

  async create(entry: {
    action: AdminActionLog["action"];
    performedBy: string;
    targetUserId: string;
    metadata?: Record<string, unknown>;
  }): Promise<AdminActionLog> {
    const payload = normalizePayload({
      action: entry.action,
      performedBy: entry.performedBy,
      targetUserId: entry.targetUserId,
      metadata: encodeMetadata(entry.metadata),
      createdAt: new Date(),
    });

    const dbId = ensureDatabaseIdAvailable();
    const document = await databases.createDocument(
      dbId,
      ADMIN_ACTION_LOGS_COLLECTION,
      ID.unique(),
      payload
    );
    return mapAdminActionLog(document);
  },
};
