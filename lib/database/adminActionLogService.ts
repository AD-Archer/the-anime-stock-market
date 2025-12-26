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

  /**
   * Server-side search with filter options. This performs a bounded listDocuments call
   * and applies filters server-side to return a paginated response.
   */
  async search(opts: {
    q?: string;
    actions?: string[];
    actionsExclude?: boolean;
    performed?: string[];
    performedExclude?: boolean;
    target?: string[];
    targetExclude?: boolean;
    dateStart?: string | null;
    dateEnd?: string | null;
    dateExclude?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: AdminActionLog[]; total: number }> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      // fetch a reasonable batch to filter in memory (Appwrite query capabilities are limited for complex OR/NOT combos)
      const fetchLimit = 1000; // safeguard
      const response = await databases.listDocuments(
        dbId,
        ADMIN_ACTION_LOGS_COLLECTION,
        [Query.orderDesc("createdAt"), Query.limit(fetchLimit)]
      );

      const all = response.documents.map(mapAdminActionLog);

      const normalize = (s: string) => s.trim().toLowerCase();
      const q = (opts.q || "").trim().toLowerCase();
      const actions = (opts.actions || []).map(normalize);
      const performed = (opts.performed || []).map(normalize);
      const target = (opts.target || []).map(normalize);

      const filtered = all.filter((entry) => {
        // basic query
        if (q) {
          // Do not import UI-only mappings on server; use raw action value
          const actionLabel = (entry.action || "").toString().toLowerCase();
          const performedBy = (entry.performedBy || "").toLowerCase();
          const targetUser = (entry.targetUserId || "").toLowerCase();
          const when = entry.createdAt.toLocaleString().toLowerCase();
          const metadata = entry.metadata
            ? JSON.stringify(entry.metadata).toLowerCase()
            : "";
          const id = entry.id.toLowerCase();

          const matchesQuery =
            actionLabel.includes(q) ||
            performedBy.includes(q) ||
            targetUser.includes(q) ||
            when.includes(q) ||
            metadata.includes(q) ||
            id.includes(q);

          if (!matchesQuery) return false;
        }

        // actions include/exclude
        if (actions.length > 0) {
          const inSet = actions.includes((entry.action || "").toLowerCase());
          if (opts.actionsExclude ? inSet : !inSet) return false;
        }

        // performed
        if (performed.length > 0) {
          const p = (entry.performedBy || "").toLowerCase();
          const has = performed.some((pat) => p.includes(pat));
          if (opts.performedExclude ? has : !has) return false;
        }

        // target
        if (target.length > 0) {
          const t = (entry.targetUserId || "").toLowerCase();
          const has = target.some((pat) => t.includes(pat));
          if (opts.targetExclude ? has : !has) return false;
        }

        // date range
        if (opts.dateStart || opts.dateEnd) {
          const ts = entry.createdAt.getTime();
          const startOk = opts.dateStart
            ? ts >= new Date(opts.dateStart).getTime()
            : true;
          const endOk = opts.dateEnd
            ? ts <= new Date(opts.dateEnd).getTime() + 24 * 60 * 60 * 1000 - 1
            : true;
          const inRange = startOk && endOk;
          if (opts.dateExclude ? inRange : !inRange) return false;
        }

        return true;
      });

      const total = filtered.length;
      const page = Math.max(1, opts.page || 1);
      const limit = Math.max(10, Math.min(200, opts.limit || 50));
      const start = (page - 1) * limit;
      const items = filtered.slice(start, start + limit);

      return { items, total };
    } catch (err) {
      console.warn("Admin action log search failed:", err);
      return { items: [], total: 0 };
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
