import { NextResponse } from "next/server";
import {
  getAdminDatabases,
  Query as AdminQuery,
} from "@/lib/appwrite/appwrite-admin";
import {
  DATABASE_ID,
  STOCKS_COLLECTION,
  metadataService,
} from "@/lib/database";

type AdminListResult = {
  documents: Array<Record<string, unknown>>;
  reportedTotal: number;
};

async function adminListAll(): Promise<AdminListResult> {
  try {
    const dbId = DATABASE_ID;
    if (!dbId) throw new Error("Missing database ID");

    const databases = getAdminDatabases();
    const limit = 100;
    let offset = 0;
    let reportedTotal = 0;
    const documents: Array<Record<string, unknown>> = [];

    while (true) {
      const queries = [AdminQuery.limit(limit), AdminQuery.offset(offset)];
      const res = await databases.listDocuments(
        dbId,
        STOCKS_COLLECTION,
        queries
      );
      reportedTotal = res.total;
      documents.push(...res.documents);
      if (res.documents.length < limit) break;
      offset += limit;
    }

    return { documents, reportedTotal };
  } catch (error) {
    console.warn("Admin list failed for backfill:", error);
    return { documents: [], reportedTotal: 0 };
  }
}

export async function POST() {
  try {
    const { documents, reportedTotal } = await adminListAll();
    if (documents.length === 0) {
      return NextResponse.json(
        { error: "No stocks found for backfill" },
        { status: 400 }
      );
    }

    // Sort by createdAt to assign stable ordering
    const sorted = [...documents].sort((a: any, b: any) => {
      const aDate = new Date(a.createdAt || a.$createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || b.$createdAt || 0).getTime();
      return aDate - bDate;
    });

    const db = getAdminDatabases();
    const dbId = DATABASE_ID;
    let updated = 0;
    let keptExisting = 0;
    let fixedDuplicates = 0;
    let missingAssigned = 0;

    let maxExisting =
      sorted.reduce((max, doc: any) => {
        const n = Number(doc.characterNumber);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0) || 0;

    const used = new Set<number>();

    for (const doc of sorted) {
      const num = Number(doc.characterNumber);
      const validNum = Number.isFinite(num) && num > 0;

      if (validNum && !used.has(num)) {
        used.add(num);
        keptExisting++;
        continue;
      }

      // Either missing or duplicate; assign next after maxExisting
      maxExisting += 1;
      const characterNumber = maxExisting;

      try {
        await db.updateDocument(dbId, STOCKS_COLLECTION, doc.$id as string, {
          characterNumber,
        });
        used.add(characterNumber);
        updated++;
        if (validNum) {
          fixedDuplicates++;
        } else {
          missingAssigned++;
        }
      } catch (error) {
        console.warn(`Failed to update characterNumber for ${doc.$id}`, error);
      }
    }

    // Set the sequence to the highest assigned number so future inserts continue
    await metadataService.setCharacterSequence(maxExisting);

    return NextResponse.json({
      success: true,
      updated,
      keptExisting,
      missingAssigned,
      fixedDuplicates,
      total: sorted.length,
      reportedTotal,
      sequence: maxExisting,
    });
  } catch (error) {
    console.error("Failed to backfill character numbers:", error);
    return NextResponse.json(
      { error: "Failed to backfill character numbers" },
      { status: 500 }
    );
  }
}
