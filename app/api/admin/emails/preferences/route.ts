import { NextRequest, NextResponse } from "next/server";
import { getAdminDatabases } from "@/lib/appwrite/appwrite-admin";
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
      weeklyPerformanceEmailNotifications: false,
      weeklyReturnToAppEmailNotifications: false,
      directMessageEmailNotifications: false,
    };
  }

  return {
    emailNotificationsEnabled: true,
    tradeEmailNotifications: true,
    weeklyPerformanceEmailNotifications: true,
    weeklyReturnToAppEmailNotifications: true,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const adminUserId = String(body?.adminUserId || "");
    const targetUserId = String(body?.targetUserId || "");
    const action = String(body?.action || "") as PreferenceAction;

    if (!adminUserId || !targetUserId || !action) {
      return NextResponse.json(
        { error: "adminUserId, targetUserId, and action are required" },
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
    const updates = updatesForAction(action);
    const updated = await databases.updateDocument(
      DATABASE_ID,
      USERS_COLLECTION,
      targetUserId,
      updates
    );

    return NextResponse.json({
      success: true,
      action,
      userId: updated.$id,
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
