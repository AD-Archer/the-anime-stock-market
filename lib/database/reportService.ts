import { ID } from "appwrite";
import { databases } from "../appwrite/appwrite";
import type { Report } from "../types";
import {
  DATABASE_ID,
  REPORTS_COLLECTION,
  mapReport,
  normalizePayload,
  ensureDatabaseIdAvailable,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

const serializeReportPayload = (report: Partial<Report>) => {
  const payload: Record<string, unknown> = {};
  const metadata: Record<string, unknown> = {};

  Object.entries(report as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === "commentContent") {
      metadata.commentContent = value;
    } else if (key === "messageContent") {
      metadata.messageContent = value;
    } else if (key === "threadContext" && Array.isArray(value)) {
      metadata.threadContext = value.map((snapshot: any) => ({
        ...snapshot,
        timestamp: snapshot.timestamp
          ? new Date(snapshot.timestamp).toISOString()
          : new Date().toISOString(),
      }));
    } else if (key === "commentLocation") {
      metadata.commentLocation = value;
    } else {
      payload[key] = value;
    }
  });

  if (Object.keys(metadata).length > 0) {
    payload.metadata = JSON.stringify(metadata);
  }

  return payload;
};

export const reportService = {
  async getAll(): Promise<Report[]> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.listDocuments(dbId, REPORTS_COLLECTION);
      return response.documents.map(mapReport);
    } catch (error) {
      console.warn("Failed to fetch reports from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Report | null> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.getDocument(
        dbId,
        REPORTS_COLLECTION,
        id
      );
      return mapReport(response);
    } catch (error) {
      console.warn("Failed to fetch report from database:", error);
      return null;
    }
  },

  async create(report: Creatable<Report>): Promise<Report> {
    try {
      const documentId = report.id ?? ID.unique();
      const { id: _ignored, ...data } = report as any;
      const payload = serializeReportPayload(data);
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.createDocument(
        dbId,
        REPORTS_COLLECTION,
        documentId,
        normalizePayload(payload)
      );
      return mapReport(response);
    } catch (error) {
      console.warn("Failed to create report in database:", error);
      throw error;
    }
  },

  async update(id: string, report: Partial<Report>): Promise<Report> {
    try {
      const payload = serializeReportPayload(report as any);
      const dbId = ensureDatabaseIdAvailable();
      const response = await databases.updateDocument(
        dbId,
        REPORTS_COLLECTION,
        id,
        normalizePayload(payload)
      );
      return mapReport(response);
    } catch (error) {
      console.warn("Failed to update report in database:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const dbId = ensureDatabaseIdAvailable();
      await databases.deleteDocument(dbId, REPORTS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete report from database:", error);
      throw error;
    }
  },
};
