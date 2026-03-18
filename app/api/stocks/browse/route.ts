import { NextResponse } from "next/server";
import { stockService, transactionService } from "@/lib/database";
import type { Stock } from "@/lib/types";
import type { StockBrowseSort } from "@/lib/database/stockService";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 50;
const MAX_SEARCH_LIMIT = 200;
const ACTIVITY_WINDOW = 2000;

const VALID_SORTS: StockBrowseSort[] = [
  "most_active",
  "trending",
  "price_desc",
  "price_asc",
  "rarest",
  "newest",
];

function parseSort(value: string | null): StockBrowseSort {
  if (!value) return "most_active";
  return VALID_SORTS.includes(value as StockBrowseSort)
    ? (value as StockBrowseSort)
    : "most_active";
}

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
}

function parseOffset(value: string | null): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function buildActivityMap(stockIds: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const stockId of stockIds) {
    map.set(stockId, (map.get(stockId) ?? 0) + 1);
  }
  return map;
}

function sortStocks(
  stocks: Stock[],
  sort: StockBrowseSort,
  activityMap: Map<string, number> = new Map()
): Stock[] {
  const sorted = [...stocks];
  if (sort === "most_active") {
    sorted.sort(
      (a, b) => (activityMap.get(b.id) ?? 0) - (activityMap.get(a.id) ?? 0)
    );
    return sorted;
  }
  if (sort === "trending") {
    sorted.sort((a, b) => {
      const aScore =
        (activityMap.get(a.id) ?? 0) * 2 + a.currentPrice * a.totalShares;
      const bScore =
        (activityMap.get(b.id) ?? 0) * 2 + b.currentPrice * b.totalShares;
      return bScore - aScore;
    });
    return sorted;
  }
  if (sort === "price_desc") {
    sorted.sort((a, b) => b.currentPrice - a.currentPrice);
    return sorted;
  }
  if (sort === "price_asc") {
    sorted.sort((a, b) => a.currentPrice - b.currentPrice);
    return sorted;
  }
  if (sort === "rarest") {
    sorted.sort((a, b) => a.availableShares - b.availableShares);
    return sorted;
  }
  sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return sorted;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const sort = parseSort(url.searchParams.get("sort"));
  const limit = parseLimit(url.searchParams.get("limit"));
  const offset = parseOffset(url.searchParams.get("offset"));

  try {
    if (q) {
      const allMatches = await stockService.search({
        query: q,
        limit: MAX_SEARCH_LIMIT,
      });

      let activityMap = new Map<string, number>();
      if (sort === "most_active" || sort === "trending") {
        const recentTransactions = await transactionService.getRecent(
          ACTIVITY_WINDOW
        );
        activityMap = buildActivityMap(
          recentTransactions.map((transaction) => transaction.stockId)
        );
      }

      const sorted = sortStocks(allMatches, sort, activityMap);
      const items = sorted.slice(offset, offset + limit);
      const nextOffset = offset + items.length;

      return NextResponse.json({
        items,
        hasMore: nextOffset < sorted.length,
        nextOffset,
      });
    }

    if (sort === "most_active" || sort === "trending") {
      const recentTransactions = await transactionService.getRecent(
        ACTIVITY_WINDOW
      );
      const activityMap = buildActivityMap(
        recentTransactions.map((transaction) => transaction.stockId)
      );
      const rankedIds = Array.from(activityMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([stockId]) => stockId);

      const windowIds = rankedIds.slice(offset, offset + limit + 1);
      const fetched = await Promise.all(windowIds.map((stockId) => stockService.getById(stockId)));
      const activeStocks = fetched.filter(
        (stock): stock is NonNullable<typeof stock> => Boolean(stock)
      );
      const sortedActive = sortStocks(activeStocks, sort, activityMap);

      if (sortedActive.length >= limit + 1) {
        const items = sortedActive.slice(0, limit);
        return NextResponse.json({
          items,
          hasMore: true,
          nextOffset: offset + items.length,
        });
      }

      const needed = limit + 1 - sortedActive.length;
      const fallback = await stockService.getBrowsePage({
        limit: Math.min(needed, MAX_LIMIT),
        offset,
        sort: "newest",
      });
      const seen = new Set(sortedActive.map((stock) => stock.id));
      const merged = [...sortedActive];
      for (const stock of fallback.items) {
        if (!seen.has(stock.id)) {
          seen.add(stock.id);
          merged.push(stock);
        }
      }

      const hasMore =
        merged.length > limit || fallback.hasMore || rankedIds.length > offset + limit;
      const items = hasMore ? merged.slice(0, limit) : merged;

      return NextResponse.json({
        items,
        hasMore,
        nextOffset: offset + items.length,
      });
    }

    const page = await stockService.getBrowsePage({ limit, offset, sort });
    return NextResponse.json(page);
  } catch (err) {
    console.error("Failed to browse stocks", err);
    return NextResponse.json(
      { items: [], hasMore: false, nextOffset: offset },
      { status: 500 }
    );
  }
}
