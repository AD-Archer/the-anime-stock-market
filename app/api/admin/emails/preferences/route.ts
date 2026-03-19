import { NextRequest, NextResponse } from "next/server";
import { getAdminDatabases, Query } from "@/lib/appwrite/appwrite-admin";
import { DATABASE_ID, USERS_COLLECTION } from "@/lib/database";

type PreferenceAction = "unsubscribe_all" | "enable_defaults";

const isAdminUser = async (adminUserId: string): Promise<boolean> => {
  const db = getAdminDatabases();
  try {
    const adminDoc = await db.getDocument(
      DATABASE_ID,
      USERS_COLLECTION,
      adminUserId
    );
    return (adminDoc as any).isAdmin === true;
  } catch {
    return false;
  }
};

function updatesForAction(action: PreferenceAction): Record<string, boolean> {
  if (action === "unsubscribe_all") {
    return {
      emailNotificationsEnabled: false,
      tradeEmailNotifications: false,
      dailyTradeDigestEmailNotifications: false,
      weeklyPerformanceEmailNotifications: false,
      weeklyReturnToAppEmailNotifications: false,
      directMessageEmailNotifications: false,
    };
  }

  return {
    emailNotificationsEnabled: true,
    directMessageEmailNotifications: false,
    tradeEmailNotifications: true,
    dailyTradeDigestEmailNotifications: true,
    weeklyPerformanceEmailNotifications: true,
    weeklyReturnToAppEmailNotifications: true,
  };
}

async function listAllUserIds(): Promise<string[]> {
  const databases = getAdminDatabases();
  const ids: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION, [
      Query.limit(limit),
      Query.offset(offset),
    ]);
    if (response.documents.length === 0) break;

    ids.push(...response.documents.map((doc) => String(doc.$id)));
    if (response.documents.length < limit) break;
    offset += response.documents.length;
  }

  return ids;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const adminUserId = String(body?.adminUserId || "");
    const targetUserId = String(body?.targetUserId || "");
    const targetUserIds = Array.isArray(body?.targetUserIds)
      ? body.targetUserIds
          .map((id: unknown) => String(id || "").trim())
          .filter(Boolean)
      : [];
    const applyToAll = body?.applyToAll === true;
    const action = String(body?.action || "") as PreferenceAction;

    if (!adminUserId || !action) {
      return NextResponse.json(
        { error: "adminUserId and action are required" },
        { status: 400 }
      );
    }

    if (action !== "unsubscribe_all" && action !== "enable_defaults") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const adminAllowed = await isAdminUser(adminUserId);
    if (!adminAllowed) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const databases = getAdminDatabases();
    let resolvedTargetUserIds: string[] = [];
    if (applyToAll) {
      resolvedTargetUserIds = await listAllUserIds();
    } else if (targetUserIds.length > 0) {
      resolvedTargetUserIds = targetUserIds;
    } else if (targetUserId) {
      resolvedTargetUserIds = [targetUserId];
    }

    const uniqueTargetUserIds = Array.from(new Set(resolvedTargetUserIds));
    if (uniqueTargetUserIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "No target users provided. Pass targetUserId, targetUserIds, or applyToAll=true.",
        },
        { status: 400 }
      );
    }

    const updates = updatesForAction(action);
    const updatedUserIds: string[] = [];
    const failedUserIds: string[] = [];

    for (const userId of uniqueTargetUserIds) {
      try {
        await databases.updateDocument(DATABASE_ID, USERS_COLLECTION, userId, updates);
        updatedUserIds.push(userId);
      } catch (error) {
        console.warn("Failed to update email preferences for user", userId, error);
        failedUserIds.push(userId);
      }
    }

    return NextResponse.json({
      success: failedUserIds.length === 0,
      action,
      applyToAll,
      updatedCount: updatedUserIds.length,
      failedCount: failedUserIds.length,
      updatedUserIds,
      failedUserIds,
      updates,
    });
  } catch (error) {
    console.error("Failed to update email preferences:", error);
    return NextResponse.json(
      { error: "Failed to update email preferences" },
      { status: 500 }
    );
  }
}
