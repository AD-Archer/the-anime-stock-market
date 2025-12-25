import { NextRequest, NextResponse } from "next/server";
import { getAdminDatabases } from "@/lib/appwrite/appwrite-admin";
import { DATABASE_ID, STOCKS_COLLECTION } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (!ids.length) {
      return NextResponse.json(
        { success: false, error: "No ids provided" },
        { status: 400 }
      );
    }

    const databases = getAdminDatabases();
    const results: Array<{
      id: string;
      exists: boolean;
      doc?: any;
      error?: string;
    }> = [];

    for (const id of ids) {
      try {
        const doc = await databases.getDocument(
          DATABASE_ID,
          STOCKS_COLLECTION,
          id
        );
        results.push({ id, exists: true, doc });
      } catch (error) {
        // If not found, Appwrite throws - handle missing documents gracefully
        results.push({ id, exists: false, error: (error as Error).message });
      }
    }

    console.log(
      `[admin/verify-stocks] Verified ${ids.length} ids. Found ${
        results.filter((r) => r.exists).length
      }`
    );

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[admin/verify-stocks] Failed to verify stocks:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
