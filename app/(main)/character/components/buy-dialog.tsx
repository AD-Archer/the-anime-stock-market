"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface BuyDialogProps {
  stockId: string
  onClose: () => void
}

export function BuyDialog({ stockId, onClose }: BuyDialogProps) {
  const { stocks, currentUser, buyStock } = useStore()
  const { toast } = useToast()
  const [shares, setShares] = useState(1)

  const stock = stocks.find((s) => s.id === stockId)
  if (!stock) return null

  const totalCost = stock.currentPrice * shares
  const canAfford = currentUser ? currentUser.balance >= totalCost : false
  const hasEnoughShares = stock.availableShares >= shares

  const handleBuy = () => {
    if (!canAfford) {
      toast({
        title: "Insufficient Balance",
        description: "You do not have enough funds to complete this purchase.",
        variant: "destructive",
      })
      return
    }

    if (!hasEnoughShares) {
      toast({
        title: "Not Enough Shares",
        description: "There are not enough shares available for this purchase.",
        variant: "destructive",
      })
      return
    }

    const success = buyStock(stockId, shares)
    if (success) {
      toast({
        title: "Purchase Successful",
        description: `You bought ${shares} shares of ${stock.characterName} for $${totalCost.toFixed(2)}`,
      })
      onClose()
    } else {
      toast({
        title: "Purchase Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buy {stock.characterName}</DialogTitle>
          <DialogDescription>{stock.anime}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="shares">Number of Shares</Label>
            <Input
              id="shares"
              type="number"
              min={1}
              max={stock.availableShares}
              value={shares}
              onChange={(e) => setShares(Math.max(1, Number.parseInt(e.target.value) || 1))}
            />
            <p className="text-sm text-muted-foreground">Available: {stock.availableShares.toLocaleString()} shares</p>
          </div>
          <div className="space-y-2 rounded-lg bg-muted p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price per share:</span>
              <span className="font-mono font-medium text-foreground">${stock.currentPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shares:</span>
              <span className="font-mono font-medium text-foreground">{shares}</span>
            </div>
            <div className="border-t border-border pt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-foreground">Total Cost:</span>
                <span className="font-mono text-lg font-bold text-foreground">${totalCost.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your Balance:</span>
              <span className={`font-mono font-medium ${canAfford ? "text-chart-4" : "text-destructive"}`}>
                ${currentUser?.balance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleBuy} disabled={!canAfford || !hasEnoughShares}>
            Confirm Purchase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
