import { useState, useMemo } from "react";
import { StockCard } from "@/components/stock-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Activity } from "lucide-react";
import { useStore } from "@/lib/store";

interface TopStocksSectionProps {
  topStocks: any[];
  onBuy: (stockId: string) => void;
}

export function TopStocksSection({ topStocks, onBuy }: TopStocksSectionProps) {
  const [filter, setFilter] = useState<
    "most_active" | "marketcap" | "price_desc" | "price_asc" | "rarest" | "recommended"
  >("most_active");
  
  const { transactions } = useStore();

  // Calculate transaction count for each stock
  const stockTransactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach(transaction => {
      counts[transaction.stockId] = (counts[transaction.stockId] || 0) + 1;
    });
    return counts;
  }, [transactions]);

  const compute = () => {
    if (!topStocks || !Array.isArray(topStocks)) return [];
    let arr = [...topStocks];
    switch (filter) {
      case "most_active":
        arr.sort((a, b) => {
          const aCount = stockTransactionCounts[a.id] || 0;
          const bCount = stockTransactionCounts[b.id] || 0;
          return bCount - aCount;
        });
        break;
      case "price_desc":
        arr.sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case "price_asc":
        arr.sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case "rarest":
        arr.sort((a, b) => a.availableShares - b.availableShares);
        break;
      case "recommended":
        // For recommended, use market cap descending as heuristic
        arr.sort(
          (a, b) =>
            b.currentPrice * b.totalShares - a.currentPrice * a.totalShares
        );
        break;
      default:
        // marketcap
        arr.sort(
          (a, b) =>
            b.currentPrice * b.totalShares - a.currentPrice * a.totalShares
        );
        break;
    }
    return arr.slice(0, 10);
  };

  const top10 = compute();

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          {filter === "most_active" ? (
            <Activity className="h-6 w-6" />
          ) : (
            <TrendingUp className="h-6 w-6" />
          )}
          {filter === "most_active" ? "Most Active Characters" : "Top 10 Characters"}
        </h2>

        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most_active">Most Active</SelectItem>
              <SelectItem value="marketcap">Most Market Cap</SelectItem>
              <SelectItem value="price_desc">Most Expensive</SelectItem>
              <SelectItem value="price_asc">Least Expensive</SelectItem>
              <SelectItem value="rarest">Rarest</SelectItem>
              <SelectItem value="recommended">Recommended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5">
        {top10.map((stock) => (
          <StockCard
            key={stock.id}
            stock={stock}
            onBuy={() => onBuy(stock.id)}
            showDescription={filter !== "most_active"}
          />
        ))}
      </div>
    </div>
  );
}
