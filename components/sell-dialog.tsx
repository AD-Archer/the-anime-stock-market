"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { useRouter } from "next/navigation"
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

interface SellDialogProps {
  stockId: string
  maxShares: number
  onClose: () => void
}

export function SellDialog({ stockId, maxShares, onClose }: SellDialogProps) {
  const { stocks, currentUser, sellStock } = useStore()
  const { toast } = useToast()
  const router = useRouter()
  const [shares, setShares] = useState(1)

  const stock = stocks.find((s) => s.id === stockId)
  if (!stock) return null

  // Check if user is authenticated
  if (!currentUser) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              You need to sign in to sell stocks. Please sign in to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => {
              onClose()
              router.push("/auth/signin")
            }}>
              Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const totalRevenue = stock.currentPrice * shares

  const handleSell = async () => {
    if (shares > maxShares) {
      toast({
        title: "Invalid Amount",
        description: `You only own ${maxShares} shares.`,
        variant: "destructive",
      })
      return
    }

    const success = await sellStock(stockId, shares)
    if (success) {
      toast({
        title: "Sale Successful",
        description: `You sold ${shares} shares of ${stock.characterName} for $${totalRevenue.toFixed(2)}`,
      })
      onClose()
    } else {
      toast({
        title: "Sale Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell {stock.characterName}</DialogTitle>
          <DialogDescription>{stock.anime}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="shares">Number of Shares</Label>
            <Input
              id="shares"
              type="number"
              min={1}
              max={maxShares}
              value={shares}
              onChange={(e) => setShares(Math.max(1, Math.min(maxShares, Number.parseInt(e.target.value) || 1)))}
            />
            <p className="text-sm text-muted-foreground">You own: {maxShares.toLocaleString()} shares</p>
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
                <span className="font-semibold text-foreground">Total Revenue:</span>
                <span className="font-mono text-lg font-bold text-chart-4">${totalRevenue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSell} disabled={shares > maxShares || shares < 1}>
            Confirm Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
