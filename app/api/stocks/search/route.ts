import { NextResponse } from "next/server";
import { stockService } from "@/lib/database";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() || "";
  const anime = url.searchParams.get("anime")?.trim() || "";
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") || 50), 1),
    200
  );

  try {
    const results = await stockService.search({
      query: q,
      animeSlug: anime,
      limit,
    });
    return NextResponse.json(results);
  } catch (err) {
    console.error("Failed to search stocks", err);
    return NextResponse.json([], { status: 500 });
  }
}
