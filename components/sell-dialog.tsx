"use client"

import { useEffect, useState } from "react"
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
import { ToastAction } from "@/components/ui/toast"

interface SellDialogProps {
  stockId: string
  maxShares: number
  onClose: () => void
}

export function SellDialog({ stockId, onClose }: SellDialogProps) {
  const { stocks, currentUser, sellStock, getUserPortfolio } = useStore()
  const { toast } = useToast()
  const router = useRouter()
  const [sharesInput, setSharesInput] = useState("1")
  const [resolvedStock, setResolvedStock] = useState<any | null>(null)
  const [isResolvingStock, setIsResolvingStock] = useState(false)

  const stockFromStore = stocks.find((s) => s.id === stockId)
  const stock = stockFromStore || resolvedStock

  useEffect(() => {
    let cancelled = false
    if (stockFromStore) {
      return
    }
    const startTid = setTimeout(() => {
      setIsResolvingStock(true)
    }, 0)
    fetch(`/api/stocks/resolve?id=${encodeURIComponent(stockId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        const normalized = {
          ...data,
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        }
        setResolvedStock(normalized)
        useStore.setState((state) => ({
          stocks: state.stocks.some((s) => s.id === normalized.id)
            ? state.stocks
            : [...state.stocks, normalized],
        }))
      })
      .catch((error) => {
        console.error("Failed to resolve stock for sell dialog:", error)
      })
      .finally(() => {
        if (!cancelled) setIsResolvingStock(false)
      })

    return () => {
      cancelled = true
      clearTimeout(startTid)
    }
  }, [stockId, stockFromStore])

  if (!stock) {
    if (isResolvingStock) {
      return (
        <Dialog open onOpenChange={onClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Loading stock...</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
    }
    return null
  }

  const parsedShares = Number.parseInt(sharesInput, 10)
  const shares = Number.isFinite(parsedShares) ? parsedShares : 0
  const ownedShares =
    currentUser
      ? getUserPortfolio(currentUser.id).find((p) => p.stockId === stockId)?.shares ?? 0
      : 0
  const isValidShares = shares >= 1 && shares <= ownedShares

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

  const buildSupportHref = (
    message: string,
    errorCode?: string,
    details?: {
      requestedShares?: number
      ownedShares?: number
      databaseShares?: number
    },
  ) => {
    const params = new URLSearchParams({
      tag: "error",
      subject: `Sell issue: ${stock.characterName}`,
      body: [
        `I ran into a sell issue while trading ${stock.characterName}.`,
        "",
        `Stock ID: ${stockId}`,
        `Character: ${stock.characterName}`,
        `Anime: ${stock.anime}`,
        `Requested shares: ${details?.requestedShares ?? shares}`,
        `Owned shares shown in app: ${details?.ownedShares ?? ownedShares}`,
        typeof details?.databaseShares === "number"
          ? `Owned shares in DB records: ${details.databaseShares}`
          : "",
        errorCode ? `Error code: ${errorCode}` : "",
        `Error details: ${message}`,
        `Timestamp: ${new Date().toISOString()}`,
      ]
        .filter(Boolean)
        .join("\n"),
      referenceId: stockId,
    })
    return `/support?${params.toString()}`
  }

  const handleSell = async () => {
    if (!sharesInput.trim() || Number.isNaN(parsedShares) || parsedShares < 1) {
      toast({
        title: "Invalid Amount",
        description: "Please enter at least 1 share.",
        variant: "destructive",
      })
      return
    }

    if (shares > ownedShares) {
      toast({
        title: "Invalid Amount",
        description: `You only own ${ownedShares} shares.`,
        variant: "destructive",
        action: (
          <ToastAction
            altText="Report issue"
            onClick={() =>
              router.push(
                buildSupportHref(
                  `Tried to sell ${shares} shares but only had ${ownedShares}.`,
                  "INSUFFICIENT_LOCAL_SHARES",
                  { requestedShares: shares, ownedShares }
                )
              )
            }
          >
            Report Issue
          </ToastAction>
        ),
      })
      return
    }

    const result = await sellStock(stockId, shares)
    if (result.success) {
      toast({
        title: "Sale Successful",
        description: `You sold ${shares} shares of ${stock.characterName} for $${totalRevenue.toFixed(2)}`,
      })
      onClose()
    } else {
      const description =
        result.errorCode === "INSUFFICIENT_DATABASE_SHARES"
          ? `You tried to sell ${shares} shares, but saved records only show ${result.databaseShares ?? 0} shares. Please refresh and try again.`
          : result.errorCode === "INSUFFICIENT_LOCAL_SHARES"
            ? `You only own ${result.ownedShares ?? ownedShares} shares.`
            : result.errorMessage || "Something went wrong while processing this sell."
      toast({
        title: "Sale Failed",
        description,
        variant: "destructive",
        action: (
          <ToastAction
            altText="Contact support"
            onClick={() =>
              router.push(
                buildSupportHref(description, result.errorCode, {
                  requestedShares: result.requestedShares ?? shares,
                  ownedShares: result.ownedShares ?? ownedShares,
                  databaseShares: result.databaseShares,
                })
              )
            }
          >
            Contact Support
          </ToastAction>
        ),
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
              max={Math.max(ownedShares, 1)}
              value={sharesInput}
              onChange={(e) => {
                const value = e.target.value
                if (value === "" || /^[0-9]+$/.test(value)) {
                  setSharesInput(value)
                }
              }}
            />
            <p className="text-sm text-muted-foreground">You own: {ownedShares.toLocaleString()} shares</p>
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
          <Button onClick={handleSell} disabled={!isValidShares || shares > ownedShares}>
            Confirm Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
