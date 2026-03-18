import { NextResponse } from "next/server";
import { stockService } from "@/lib/database";
import { generateCharacterSlug } from "@/lib/utils";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const identifier = url.searchParams.get("id")?.trim() || "";

  if (!identifier) {
    return NextResponse.json(null, { status: 400 });
  }

  try {
    const byId = await stockService.getById(identifier);
    if (byId) return NextResponse.json(byId);

    const bySlug = await stockService.getByCharacterSlug(identifier);
    if (bySlug) return NextResponse.json(bySlug);

    const normalized = generateCharacterSlug(identifier);
    const candidates = await stockService.search({ query: identifier, limit: 200 });
    const match =
      candidates.find(
        (stock) => generateCharacterSlug(stock.characterSlug) === normalized
      ) ||
      candidates.find(
        (stock) => generateCharacterSlug(stock.characterName) === normalized
      );

    if (match) return NextResponse.json(match);
    return NextResponse.json(null, { status: 404 });
  } catch (error) {
    console.error("Failed to resolve stock", error);
    return NextResponse.json(null, { status: 500 });
  }
}
