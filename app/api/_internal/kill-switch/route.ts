import { NextResponse } from "next/server";
import { clearDatabase } from "@/lib/database/admin";
import { adminActionLogService } from "@/lib/database/adminActionLogService";

export async function POST(request: Request) {
  // Only allow when explicitly enabled
  if (process.env.KILL_SWITCH_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Kill switch disabled" },
      { status: 403 }
    );
  }

  const secret = process.env.KILL_SWITCH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Kill switch secret not configured" },
      { status: 500 }
    );
  }

  let body: any = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const provided = request.headers.get("x-kill-secret") || body.secret;
  const confirm = (
    request.headers.get("x-kill-confirm") ||
    body.confirm ||
    "false"
  ).toString();

  if (provided !== secret || confirm !== "true") {
    return NextResponse.json(
      { error: "Unauthorized or missing confirmation" },
      { status: 403 }
    );
  }

  try {
    const counts = await clearDatabase();

    // record an admin action (performedBy optional header)
    try {
      const performedBy = request.headers.get("x-admin-id") || "system";
      await adminActionLogService.create({
        action: "kill_switch",
        performedBy,
        targetUserId: "",
        metadata: counts,
      });
    } catch (err) {
      console.warn("Failed to create admin action log for kill switch:", err);
    }

    return NextResponse.json({ success: true, cleared: counts });
  } catch (err) {
    console.error("Kill switch failed:", err);
    return NextResponse.json({ error: "Kill switch failed" }, { status: 500 });
  }
}
