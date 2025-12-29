import { NextResponse } from "next/server";
import { priceHistoryService } from "@/lib/database";

const DEBUG_PRICE_HISTORY =
  process.env.NEXT_PUBLIC_DEBUG_PRICE_HISTORY === "1";

const toSerializable = (entry: any) => ({
  id: entry.id,
  stockId: entry.stockId,
  price: entry.price,
  timestamp:
    entry.timestamp instanceof Date
      ? entry.timestamp.toISOString()
      : String(entry.timestamp),
});

export async function POST(request: Request) {
  if (!DEBUG_PRICE_HISTORY) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  try {
    const payload = await request.json();
    console.info("[price_history.debug]", payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("[price_history.debug] failed to parse payload", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function GET(request: Request) {
  if (!DEBUG_PRICE_HISTORY) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const stockId = searchParams.get("stockId");
  const limitParam = searchParams.get("limit");
  const limit = Math.max(1, Math.min(Number(limitParam) || 5, 50));

  if (!stockId) {
    return NextResponse.json(
      { ok: false, error: "stockId is required" },
      { status: 400 }
    );
  }

  try {
    const entries = await priceHistoryService.getLatestByStockId(
      stockId,
      limit
    );
    console.info("[price_history.debug:get]", {
      stockId,
      limit,
      returned: entries.length,
    });
    return NextResponse.json({
      ok: true,
      entries: entries.map(toSerializable),
    });
  } catch (error) {
    console.warn("[price_history.debug:get] failed", error);
    return NextResponse.json(
      { ok: false, error: "failed to fetch price history" },
      { status: 500 }
    );
  }
}
