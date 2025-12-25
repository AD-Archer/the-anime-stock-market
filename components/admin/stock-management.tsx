"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Loader2 } from "lucide-react";
import Image from "next/image";

export function StockManagement() {
  const {
    stocks,
    deleteStock,
    updateStockPrice,
    getStockPriceHistory,
    createShares,
  } = useStore();
  const [query, setQuery] = useState("");
  const [serverResults, setServerResults] = useState<typeof stocks | null>(
    null
  );

  // Debounced server-side search when query is present
  useEffect(() => {
    const q = query.trim();
    let mounted = true;
    const tid = setTimeout(async () => {
      if (!q) {
        setServerResults(null);
        return;
      }
      try {
        const res = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(q)}&limit=200`
        );
        if (!res.ok) {
          setServerResults([]);
          return;
        }
        const data = await res.json();
        if (!mounted) return;
        setServerResults(data);
      } catch (err) {
        console.error("Stock search failed", err);
        if (mounted) setServerResults([]);
      }
    }, 300);

    return () => {
      mounted = false;
      clearTimeout(tid);
    };
  }, [query]);

  const displayedStocks = serverResults ?? (query.trim() ? [] : stocks);
  const { toast } = useToast();
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [sharesStock, setSharesStock] = useState<string | null>(null);
  const [newShares, setNewShares] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdatePrice = (stockId: string) => {
    const price = Number.parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      });
      return;
    }

    updateStockPrice(stockId, price);
    toast({
      title: "Price Updated",
      description: `Stock price has been updated to $${price.toFixed(2)}`,
    });
    setEditingStock(null);
    setNewPrice("");
  };

  const handleDelete = async (stockId: string) => {
    const stock = stocks.find((s) => s.id === stockId);
    if (!stock) return;

    setIsDeleting(true);
    try {
      await deleteStock(stockId);
      toast({
        title: "Stock Delisted Successfully",
        description: `${stock.characterName} has been removed from the market. All shareholders have been compensated.`,
      });
    } catch (error) {
      console.error("Failed to delete stock:", error);
      toast({
        title: "Error Delisting Stock",
        description:
          "An error occurred while delisting the stock. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleCreateShares = (stockId: string) => {
    const shares = Number.parseInt(newShares);
    if (isNaN(shares) || shares <= 0) {
      toast({
        title: "Invalid Share Count",
        description: "Please enter a valid number of shares greater than 0.",
        variant: "destructive",
      });
      return;
    }

    createShares(stockId, shares);
    toast({
      title: "Shares Created",
      description: `${shares.toLocaleString()} new shares have been minted. Stock price adjusted for dilution.`,
    });
    setSharesStock(null);
    setNewShares("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search stocks by name, slug, or anime..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />
        <Button
          variant="ghost"
          onClick={() => setQuery("")}
          title="Clear search"
        >
          Clear
        </Button>

        {/* Dedupe admin action */}
      </div>

      {displayedStocks.map((stock) => {
        const priceHistory = getStockPriceHistory(stock.id);
        let priceChange = 0;
        if (priceHistory.length >= 2) {
          const previousPrice = priceHistory[priceHistory.length - 2].price;
          priceChange =
            ((stock.currentPrice - previousPrice) / previousPrice) * 100;
        }

        return (
          <Card key={stock.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <Link
                  href={`/character/${stock.characterSlug}`}
                  className="flex gap-4 hover:opacity-80 transition-opacity"
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={stock.imageUrl || "/placeholder.svg"}
                      alt={stock.characterName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">
                      {stock.characterName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {stock.anime}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {stock.description}
                    </p>
                  </div>
                </Link>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditingStock(stock.id);
                      setNewPrice(stock.currentPrice.toString());
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSharesStock(stock.id)}
                  >
                    Create Shares
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDeleteConfirm(stock.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Current Price</p>
                  <p className="font-mono text-lg font-bold text-foreground">
                    ${stock.currentPrice.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Price Change</p>
                  <p
                    className={`font-mono text-lg font-bold ${
                      priceChange >= 0 ? "text-chart-4" : "text-destructive"
                    }`}
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
                  <p className="font-mono text-lg font-bold text-foreground">
                    {stock.totalShares.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Edit Price Dialog */}
      {editingStock && (
        <Dialog open onOpenChange={() => setEditingStock(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Stock Price</DialogTitle>
              <DialogDescription>
                Set a new price for{" "}
                {stocks.find((s) => s.id === editingStock)?.characterName}
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
              <Button onClick={() => handleUpdatePrice(editingStock)}>
                Update Price
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <Dialog open onOpenChange={() => !isDeleting && setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delist Stock</DialogTitle>
              <DialogDescription>
                Are you sure you want to delist{" "}
                {stocks.find((s) => s.id === deleteConfirm)?.characterName}? All
                shareholders will be fairly compensated at the current market
                price, and notifications will be sent to all affected users.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Delisting...
                  </>
                ) : (
                  "Delist Stock"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Shares Dialog */}
      {sharesStock && (
        <Dialog open onOpenChange={() => setSharesStock(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Shares</DialogTitle>
              <DialogDescription>
                Mint new shares for{" "}
                {stocks.find((s) => s.id === sharesStock)?.characterName}. This
                will dilute the stock price based on the new share count.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="shares">Number of Shares to Create</Label>
                <Input
                  id="shares"
                  type="number"
                  min="1"
                  value={newShares}
                  onChange={(e) => setNewShares(e.target.value)}
                  placeholder="1000"
                />
                <p className="text-xs text-muted-foreground">
                  Current total:{" "}
                  {stocks
                    .find((s) => s.id === sharesStock)
                    ?.totalShares.toLocaleString()}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSharesStock(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleCreateShares(sharesStock)}>
                Create Shares
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
