import { NextResponse } from "next/server";
import { getAdminDatabases, Query } from "@/lib/appwrite/appwrite-admin";
import { DATABASE_ID, STOCKS_COLLECTION } from "@/lib/database";

export async function GET() {
  try {
    const databases = getAdminDatabases();
    const response = await databases.listDocuments(
      DATABASE_ID,
      STOCKS_COLLECTION,
      [Query.limit(1000)]
    );

    console.log(`[admin/stats] Found ${response.documents.length} stocks`);

    return NextResponse.json({
      success: true,
      stocks: {
        count: response.documents.length,
        sample: response.documents
          .slice(0, 10)
          .map((d: any) => ({ id: d.$id, characterName: d.characterName })),
      },
    });
  } catch (error) {
    console.error("[admin/stats] Failed to fetch stocks:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
