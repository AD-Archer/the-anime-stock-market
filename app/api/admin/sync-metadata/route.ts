import { NextResponse } from "next/server";
import {
  metadataService,
  stockService,
  transactionService,
  userService,
} from "@/lib/database";
import {
  getAdminDatabases,
  Query as AdminQuery,
} from "@/lib/appwrite/appwrite-admin";
import {
  DATABASE_ID,
  STOCKS_COLLECTION,
  USERS_COLLECTION,
  TRANSACTIONS_COLLECTION,
} from "@/lib/database";

type AdminListResult = {
  documents: Array<Record<string, unknown>>;
  reportedTotal: number;
};

async function adminListAll(
  collectionId: string
): Promise<AdminListResult> {
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

      const res = await databases.listDocuments(dbId, collectionId, queries);
      reportedTotal = res.total;
      documents.push(...res.documents);

      if (res.documents.length < limit) break;
      offset += limit;
    }

    return { documents, reportedTotal };
  } catch (error) {
    console.warn(`Admin list failed for ${collectionId}:`, error);
    return { documents: [], reportedTotal: 0 };
  }
}

export async function POST() {
  try {
    const [adminStocks, adminUsers, adminTxs, existingVolume] =
      await Promise.all([
        adminListAll(STOCKS_COLLECTION),
        adminListAll(USERS_COLLECTION),
        adminListAll(TRANSACTIONS_COLLECTION),
        metadataService.getTotalVolume(),
      ]);

    const stockCount =
      adminStocks.documents.length || (await stockService.getCount(true));
    const userCount =
      adminUsers.documents.length || (await userService.getCount());

    const transactions =
      adminTxs.documents.length > 0
        ? adminTxs.documents
        : await transactionService.getAll();

    const computedVolume = transactions.reduce((sum, tx: any) => {
      const amount =
        typeof tx.totalAmount === "number"
          ? tx.totalAmount
          : Number((tx as any).totalAmount) || 0;
      return sum + Math.abs(amount);
    }, 0);
    const totalVolume = Math.max(existingVolume || 0, computedVolume);

    await Promise.all([
      metadataService.setStockCount(stockCount),
      metadataService.setUserCount(userCount),
      metadataService.setTotalVolume(totalVolume),
    ]);

    return NextResponse.json({
      success: true,
      stockCount,
      userCount,
      totalVolume,
      stockSource: adminStocks.documents.length ? "admin" : "client",
      userSource: adminUsers.documents.length ? "admin" : "client",
      transactionSource: adminTxs.documents.length ? "admin" : "client",
      debug: {
        adminStockIterated: adminStocks.documents.length,
        adminStockReportedTotal: adminStocks.reportedTotal,
        adminUserIterated: adminUsers.documents.length,
        adminUserReportedTotal: adminUsers.reportedTotal,
        adminTxIterated: adminTxs.documents.length,
        adminTxReportedTotal: adminTxs.reportedTotal,
      },
    });
  } catch (error) {
    console.error("Failed to sync metadata:", error);
    return NextResponse.json(
      { error: "Failed to sync metadata" },
      { status: 500 }
    );
  }
}
