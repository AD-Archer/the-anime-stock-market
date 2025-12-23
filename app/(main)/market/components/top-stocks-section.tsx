import { StockCard } from "@/components/stock-card";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp } from "lucide-react";

interface TopStocksSectionProps {
  topStocks: any[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBuy: (stockId: string) => void;
}

export function TopStocksSection({ topStocks, searchQuery, onSearchChange, onBuy }: TopStocksSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Top 10 Best Selling Characters
        </h2>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search characters or anime..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {topStocks.map((stock) => (
          <StockCard
            key={stock.id}
            stock={stock}
            onBuy={() => onBuy(stock.id)}
          />
        ))}
      </div>
    </div>
  );
}