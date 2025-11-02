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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface CreateStockDialogProps {
  onClose: () => void
}

export function CreateStockDialog({ onClose }: CreateStockDialogProps) {
  const { createStock, currentUser } = useStore()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    characterName: "",
    anime: "",
    description: "",
    currentPrice: "",
    totalShares: "",
    imageUrl: "",
  })

  const handleSubmit = () => {
    if (
      !formData.characterName ||
      !formData.anime ||
      !formData.description ||
      !formData.currentPrice ||
      !formData.totalShares
    ) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    const price = Number.parseFloat(formData.currentPrice)
    const shares = Number.parseInt(formData.totalShares)

    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      })
      return
    }

    if (isNaN(shares) || shares <= 0) {
      toast({
        title: "Invalid Shares",
        description: "Please enter a valid number of shares greater than 0.",
        variant: "destructive",
      })
      return
    }

    createStock({
      characterName: formData.characterName,
      anime: formData.anime,
      description: formData.description,
      currentPrice: price,
      totalShares: shares,
      availableShares: shares,
      imageUrl: formData.imageUrl || "/placeholder.svg?height=400&width=400",
      createdBy: currentUser?.id || "admin",
    })

    toast({
      title: "Stock Created",
      description: `${formData.characterName} has been added to the market.`,
    })

    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Stock</DialogTitle>
          <DialogDescription>Add a new anime character stock to the market.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="characterName">Character Name *</Label>
              <Input
                id="characterName"
                value={formData.characterName}
                onChange={(e) => setFormData({ ...formData, characterName: e.target.value })}
                placeholder="e.g., Monkey D. Luffy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anime">Anime *</Label>
              <Input
                id="anime"
                value={formData.anime}
                onChange={(e) => setFormData({ ...formData, anime: e.target.value })}
                placeholder="e.g., One Piece"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the character..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPrice">Initial Price ($) *</Label>
              <Input
                id="currentPrice"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.currentPrice}
                onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                placeholder="1.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalShares">Total Shares *</Label>
              <Input
                id="totalShares"
                type="number"
                min="1"
                value={formData.totalShares}
                onChange={(e) => setFormData({ ...formData, totalShares: e.target.value })}
                placeholder="10000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL (optional)</Label>
            <Input
              id="imageUrl"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-muted-foreground">Leave empty to use a placeholder image</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Stock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
