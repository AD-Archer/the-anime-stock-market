import { NextResponse } from "next/server";
import { stockService } from "@/lib/database";

const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 500;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const anime = url.searchParams.get("anime")?.trim() || "";
  const q = url.searchParams.get("q")?.trim() || "";
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") || DEFAULT_LIMIT), 1),
    MAX_LIMIT
  );

  if (!anime) {
    return NextResponse.json([], { status: 400 });
  }

  try {
    const results = await stockService.search({
      animeSlug: anime,
      query: q,
      limit,
    });

    // Consistent ordering for the anime page (largest market cap first).
    const sorted = [...results].sort(
      (a, b) =>
        b.currentPrice * b.totalShares - a.currentPrice * a.totalShares
    );

    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Failed to fetch anime stocks", error);
    return NextResponse.json([], { status: 500 });
  }
}
