import { Query } from "appwrite";
import { databases } from "../appwrite/appwrite";
import {
  ensureDatabaseIdAvailable,
  USERS_COLLECTION,
  STOCKS_COLLECTION,
  TRANSACTIONS_COLLECTION,
  PORTFOLIOS_COLLECTION,
  PRICE_HISTORY_COLLECTION,
  COMMENTS_COLLECTION,
  BUYBACK_OFFERS_COLLECTION,
  NOTIFICATIONS_COLLECTION,
  REPORTS_COLLECTION,
  MESSAGES_COLLECTION,
  APPEALS_COLLECTION,
  ADMIN_ACTION_LOGS_COLLECTION,
  AWARDS_COLLECTION,
  FRIENDS_COLLECTION,
  SUPPORTS_COLLECTION,
  DAILY_REWARDS_COLLECTION,
  PREMIUM_ADDITIONS_COLLECTION,
} from "./utils";

// Note: This function is destructive. It deletes documents within collections.
// It should only be callable when the KILL_SWITCH is intentionally enabled.
export async function clearDatabase(): Promise<Record<string, number>> {
  const dbId = ensureDatabaseIdAvailable();
  const collections = [
    USERS_COLLECTION,
    STOCKS_COLLECTION,
    TRANSACTIONS_COLLECTION,
    PORTFOLIOS_COLLECTION,
    PRICE_HISTORY_COLLECTION,
    COMMENTS_COLLECTION,
    BUYBACK_OFFERS_COLLECTION,
    NOTIFICATIONS_COLLECTION,
    REPORTS_COLLECTION,
    MESSAGES_COLLECTION,
    APPEALS_COLLECTION,
    ADMIN_ACTION_LOGS_COLLECTION,
    AWARDS_COLLECTION,
    FRIENDS_COLLECTION,
    SUPPORTS_COLLECTION,
    DAILY_REWARDS_COLLECTION,
    PREMIUM_ADDITIONS_COLLECTION,
  ];

  const result: Record<string, number> = {};

  for (const col of collections) {
    try {
      // fetch up to 1000 docs per collection for deletion (adjust as needed)
      const listRes = await databases.listDocuments(dbId, col, [
        Query.limit(1000),
      ]);
      const documents = listRes.documents || [];
      let deleted = 0;
      for (const doc of documents) {
        try {
          await databases.deleteDocument(dbId, col, doc.$id);
          deleted += 1;
        } catch (err) {
          console.warn(
            `Failed to delete document ${doc.$id} from ${col}:`,
            err
          );
        }
      }
      result[col] = deleted;
    } catch (err) {
      console.warn(`Failed to clear collection ${col}:`, err);
      result[col] = -1;
    }
  }

  return result;
}
