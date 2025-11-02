"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Edit } from "lucide-react"
import Image from "next/image"

export function StockManagement() {
  const { stocks, deleteStock, updateStockPrice, getStockPriceHistory } = useStore()
  const { toast } = useToast()
  const [editingStock, setEditingStock] = useState<string | null>(null)
  const [newPrice, setNewPrice] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleUpdatePrice = (stockId: string) => {
    const price = Number.parseFloat(newPrice)
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      })
      return
    }

    updateStockPrice(stockId, price)
    toast({
      title: "Price Updated",
      description: `Stock price has been updated to $${price.toFixed(2)}`,
    })
    setEditingStock(null)
    setNewPrice("")
  }

  const handleDelete = (stockId: string) => {
    deleteStock(stockId)
    toast({
      title: "Stock Deleted",
      description: "The stock has been removed from the market.",
    })
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-4">
      {stocks.map((stock) => {
        const priceHistory = getStockPriceHistory(stock.id)
        let priceChange = 0
        if (priceHistory.length >= 2) {
          const previousPrice = priceHistory[priceHistory.length - 2].price
          priceChange = ((stock.currentPrice - previousPrice) / previousPrice) * 100
        }

        return (
          <Card key={stock.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={stock.imageUrl || "/placeholder.svg"}
                      alt={stock.characterName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">{stock.characterName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{stock.anime}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{stock.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditingStock(stock.id)
                      setNewPrice(stock.currentPrice.toString())
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setDeleteConfirm(stock.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Current Price</p>
                  <p className="font-mono text-lg font-bold text-foreground">${stock.currentPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Price Change</p>
                  <p
                    className={`font-mono text-lg font-bold ${priceChange >= 0 ? "text-chart-4" : "text-destructive"}`}
                  >
                    {priceChange >= 0 ? "+" : ""}
                    {priceChange.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Available Shares</p>
                  <p className="font-mono text-lg font-bold text-foreground">
                    {stock.availableShares.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Shares</p>
                  <p className="font-mono text-lg font-bold text-foreground">{stock.totalShares.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Edit Price Dialog */}
      {editingStock && (
        <Dialog open onOpenChange={() => setEditingStock(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Stock Price</DialogTitle>
              <DialogDescription>
                Set a new price for {stocks.find((s) => s.id === editingStock)?.characterName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="price">New Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStock(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleUpdatePrice(editingStock)}>Update Price</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <Dialog open onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Stock</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {stocks.find((s) => s.id === deleteConfirm)?.characterName}? This action
                cannot be undone and will remove all associated data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>
                Delete Stock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
