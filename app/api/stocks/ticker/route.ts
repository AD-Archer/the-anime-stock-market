import { NextResponse } from "next/server";
import {
  priceHistoryService,
  stockService,
  transactionService,
} from "@/lib/database";

const MAX_LIMIT = 50;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawLimit = Number(url.searchParams.get("limit") || "12");
  const limit = Math.min(Math.max(rawLimit || 12, 1), MAX_LIMIT);
  const activityWindow = Math.min(
    Math.max(Number(url.searchParams.get("activityWindow") || "200"), 50),
    500
  );

  try {
    const recentTransactions =
      await transactionService.getRecent(activityWindow);
    const activity = new Map<string, number>();
    recentTransactions.forEach((transaction) => {
      const current = activity.get(transaction.stockId) || 0;
      activity.set(transaction.stockId, current + 1);
    });

    const activeIds = Array.from(activity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    const activeStocks = await Promise.all(
      activeIds.map((id) => stockService.getById(id))
    );
    const stocks = activeStocks.filter(
      (stock): stock is NonNullable<typeof stock> => Boolean(stock)
    );

    if (stocks.length < limit) {
      const fallback = await stockService.getTickerStocks(limit);
      const existing = new Set(stocks.map((stock) => stock.id));
      fallback.forEach((stock) => {
        if (!existing.has(stock.id) && stocks.length < limit) {
          stocks.push(stock);
        }
      });
    }

    const histories = await Promise.all(
      stocks.map((stock) => priceHistoryService.getLatestByStockId(stock.id, 2))
    );

    const items = stocks.map((stock, index) => {
      const history =
        histories[index]?.filter((entry) => entry.price > 0) ?? [];
      const prevPrice =
        history.length >= 2 ? history[1].price : stock.currentPrice;
      const change =
        ((stock.currentPrice - prevPrice) / (prevPrice || 1)) * 100;

      return {
        id: stock.id,
        characterName: stock.characterName,
        characterSlug: stock.characterSlug,
        currentPrice: stock.currentPrice,
        change,
      };
    });

    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("Failed to fetch ticker stocks", err);
    return NextResponse.json([], { status: 500 });
  }
}
