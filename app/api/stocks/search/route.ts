import { NextResponse } from "next/server";
import { stockService } from "@/lib/database";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() || "";
  const anime = url.searchParams.get("anime")?.trim() || "";
  const limit = Number(url.searchParams.get("limit") || 50);

  try {
    const all = await stockService.getAll();

    let results = all;

    if (anime) {
      results = results.filter(
        (s) => s.anime.toLowerCase().replace(/\s+/g, "-") === anime
      );
    }

    if (q) {
      results = results.filter((s) =>
        [s.characterName, s.characterSlug, s.anime]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      );
    }

    results = results.slice(0, limit);

    return NextResponse.json(results);
  } catch (err) {
    console.error("Failed to search stocks", err);
    return NextResponse.json([], { status: 500 });
  }
}
