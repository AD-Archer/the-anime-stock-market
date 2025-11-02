"use client";

import { useState } from "react";
import type { Portfolio, Stock } from "@/lib/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Image from "next/image";
import { SellDialog } from "../../../components/sell-dialog";

interface PortfolioCardProps {
  portfolio: Portfolio;
  stock: Stock;
}

export function PortfolioCard({ portfolio, stock }: PortfolioCardProps) {
  const [showSellDialog, setShowSellDialog] = useState(false);

  const currentValue = stock.currentPrice * portfolio.shares;
  const invested = portfolio.averageBuyPrice * portfolio.shares;
  const profitLoss = currentValue - invested;
  const profitLossPercent = (profitLoss / invested) * 100;

  const isPositive = profitLoss > 0;
  const isNegative = profitLoss < 0;

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="p-0">
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            <Image
              src={stock.imageUrl || "/placeholder.svg"}
              alt={stock.characterName}
              fill
              className="object-cover"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="mb-3">
            <h3 className="font-bold text-foreground">{stock.characterName}</h3>
            <p className="text-sm text-muted-foreground">{stock.anime}</p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shares:</span>
              <span className="font-mono font-medium text-foreground">
                {portfolio.shares.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg. Buy Price:</span>
              <span className="font-mono font-medium text-foreground">
                ${portfolio.averageBuyPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Price:</span>
              <span className="font-mono font-medium text-foreground">
                ${stock.currentPrice.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-border pt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market Value:</span>
                <span className="font-mono font-semibold text-foreground">
                  ${currentValue.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Profit/Loss:</span>
              <div className="flex items-center gap-1">
                {isPositive && <TrendingUp className="h-4 w-4 text-chart-4" />}
                {isNegative && (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                {!isPositive && !isNegative && (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={`font-mono font-semibold ${
                    isPositive
                      ? "text-chart-4"
                      : isNegative
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {isPositive && "+"}${profitLoss.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex justify-end">
              <Badge
                variant={
                  isPositive
                    ? "default"
                    : isNegative
                    ? "destructive"
                    : "secondary"
                }
                className={
                  isPositive
                    ? "bg-chart-4 text-background hover:bg-chart-4/80"
                    : ""
                }
              >
                {isPositive && "+"}
                {profitLossPercent.toFixed(2)}%
              </Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button
            onClick={() => setShowSellDialog(true)}
            variant="outline"
            className="w-full"
          >
            Sell Stock
          </Button>
        </CardFooter>
      </Card>

      {showSellDialog && (
        <SellDialog
          stockId={stock.id}
          maxShares={portfolio.shares}
          onClose={() => setShowSellDialog(false)}
        />
      )}
    </>
  );
}
