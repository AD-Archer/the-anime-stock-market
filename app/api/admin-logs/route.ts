import { NextResponse } from "next/server";
import { adminActionLogService } from "@/lib/database/adminActionLogService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Accept filtering params
    const {
      q,
      actions,
      actionsExclude,
      performed,
      performedExclude,
      target,
      targetExclude,
      dateStart,
      dateEnd,
      dateExclude,
      page,
      limit,
    } = body || {};

    const res = await adminActionLogService.search({
      q,
      actions,
      actionsExclude,
      performed,
      performedExclude,
      target,
      targetExclude,
      dateStart,
      dateEnd,
      dateExclude,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...res });
  } catch (err) {
    console.error("admin-logs search failed:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
