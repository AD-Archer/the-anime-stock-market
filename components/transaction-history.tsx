"use client";

import type { Transaction } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const { stocks } = useStore();

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No transactions yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {transactions.map((transaction) => {
            const stock = stocks.find((s) => s.id === transaction.stockId);
            if (!stock) return null;

            const isBuy = transaction.type === "buy";

            return (
              <div
                key={transaction.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isBuy ? "bg-primary/10" : "bg-chart-4/10"
                    }`}
                  >
                    {isBuy ? (
                      <ArrowDownRight className="h-5 w-5 text-primary" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-chart-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/character/${stock.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <p className="font-semibold text-foreground truncate">
                        {stock.characterName}
                      </p>
                      <Badge variant={isBuy ? "default" : "secondary"}>
                        {isBuy ? "Buy" : "Sell"}
                      </Badge>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {transaction.shares.toLocaleString()} shares @ $
                      {transaction.pricePerShare.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.timestamp.toLocaleDateString()} at{" "}
                      {transaction.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p
                    className={`font-mono text-lg font-bold ${
                      isBuy ? "text-destructive" : "text-chart-4"
                    }`}
                  >
                    {isBuy ? "-" : "+"}${transaction.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
