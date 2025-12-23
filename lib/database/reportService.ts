import { ID } from "appwrite";
import { databases } from "../appwrite";
import type { Report } from "../types";
import {
  DATABASE_ID,
  REPORTS_COLLECTION,
  mapReport,
  normalizePayload,
} from "./utils";

type Creatable<T extends { id: string }> = Omit<T, "id"> & { id?: string };

const serializeReportPayload = (report: Partial<Report>) => {
  const payload: Record<string, unknown> = {};

  Object.entries(report as Record<string, unknown>).forEach(
    ([key, value]) => {
      if (value === undefined) return;
      if (key === "threadContext" && Array.isArray(value)) {
        payload.threadContext = JSON.stringify(
          value.map((snapshot: any) => ({
            ...snapshot,
            timestamp: snapshot.timestamp
              ? new Date(snapshot.timestamp).toISOString()
              : new Date().toISOString(),
          }))
        );
      } else if (key === "commentLocation") {
        payload.commentLocation = JSON.stringify(value);
      } else {
        payload[key] = value;
      }
    }
  );

  return payload;
};

export const reportService = {
  async getAll(): Promise<Report[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        REPORTS_COLLECTION
      );
      return response.documents.map(mapReport);
    } catch (error) {
      console.warn("Failed to fetch reports from database:", error);
      return [];
    }
  },

  async getById(id: string): Promise<Report | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
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
      const response = await databases.createDocument(
        DATABASE_ID,
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
      const response = await databases.updateDocument(
        DATABASE_ID,
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
      await databases.deleteDocument(DATABASE_ID, REPORTS_COLLECTION, id);
    } catch (error) {
      console.warn("Failed to delete report from database:", error);
      throw error;
    }
  },
};
