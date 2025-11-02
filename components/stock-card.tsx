"use client"

import type { Stock } from "@/lib/types"
import { useStore } from "@/lib/store"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface StockCardProps {
  stock: Stock
  onBuy: () => void
}

export function StockCard({ stock, onBuy }: StockCardProps) {
  const { getStockPriceHistory } = useStore()
  const priceHistory = getStockPriceHistory(stock.id)

  // Calculate price change
  let priceChange = 0
  let priceChangePercent = 0
  if (priceHistory.length >= 2) {
    const previousPrice = priceHistory[priceHistory.length - 2].price
    priceChange = stock.currentPrice - previousPrice
    priceChangePercent = (priceChange / previousPrice) * 100
  }

  const isPositive = priceChange > 0
  const isNegative = priceChange < 0

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg">
      <Link href={`/character/${stock.id}`}>
        <CardHeader className="p-0 cursor-pointer">
          <div className="relative aspect-square w-full overflow-hidden bg-muted">
            <Image src={stock.imageUrl || "/placeholder.svg"} alt={stock.characterName} fill className="object-cover" />
          </div>
        </CardHeader>
      </Link>
      <CardContent className="p-4">
        <div className="mb-2">
          <Link href={`/character/${stock.id}`}>
            <h3 className="text-lg font-bold text-foreground hover:text-primary transition-colors cursor-pointer">
              {stock.characterName}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground">{stock.anime}</p>
        </div>
        <p className="mb-4 line-clamp-2 text-sm text-foreground">{stock.description}</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">${stock.currentPrice.toFixed(2)}</p>
            {priceHistory.length >= 2 && (
              <div className="flex items-center gap-1">
                {isPositive && <TrendingUp className="h-4 w-4 text-chart-4" />}
                {isNegative && <TrendingDown className="h-4 w-4 text-destructive" />}
                {!isPositive && !isNegative && <Minus className="h-4 w-4 text-muted-foreground" />}
                <span
                  className={`text-sm font-medium ${
                    isPositive ? "text-chart-4" : isNegative ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {isPositive && "+"}
                  {priceChangePercent.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <Badge variant="secondary">{stock.availableShares.toLocaleString()} shares</Badge>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button onClick={onBuy} className="w-full" size="lg">
          Buy Stock
        </Button>
      </CardFooter>
    </Card>
  )
}
