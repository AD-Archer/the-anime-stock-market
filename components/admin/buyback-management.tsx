"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react";
import Image from "next/image";

const isUserBanned = (user: User): boolean => {
  return user.bannedUntil !== null && user.bannedUntil > new Date();
};

export function BuybackManagement() {
  const { stocks, buybackOffers, users, createBuybackOffer, getUserPortfolio } =
    useStore();
  const { toast } = useToast();

  const [selectedStock, setSelectedStock] = useState("");
  const [offeredPrice, setOfferedPrice] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("24");
  const [targetUsers, setTargetUsers] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCreateBuyback = () => {
    const price = Number.parseFloat(offeredPrice);
    const hours = Number.parseInt(expiresInHours);

    if (!selectedStock || isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please select a stock and enter a valid price.",
        variant: "destructive",
      });
      return;
    }

    createBuybackOffer(
      selectedStock,
      price,
      targetUsers.length > 0 ? targetUsers : undefined,
      hours
    );

    toast({
      title: "Buyback Offer Created",
      description: `Buyback offer created for ${
        stocks.find((s) => s.id === selectedStock)?.characterName
      }`,
    });

    setShowCreateDialog(false);
    setSelectedStock("");
    setOfferedPrice("");
    setExpiresInHours("24");
    setTargetUsers([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-500";
      case "accepted":
        return "bg-green-500";
      case "declined":
        return "bg-red-500";
      case "expired":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock className="h-4 w-4" />;
      case "accepted":
        return <CheckCircle className="h-4 w-4" />;
      case "declined":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Buyback Management</h3>
          <p className="text-sm text-muted-foreground">
            Create buyback offers to repurchase shares from users
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <DollarSign className="h-4 w-4 mr-2" />
              Create Buyback Offer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Buyback Offer</DialogTitle>
              <DialogDescription>
                Offer to repurchase shares from users at a specified price.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="stock">Stock</Label>
                <Select value={selectedStock} onValueChange={setSelectedStock}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a stock" />
                  </SelectTrigger>
                  <SelectContent>
                    {stocks.map((stock) => (
                      <SelectItem key={stock.id} value={stock.id}>
                        {stock.characterName} - ${stock.currentPrice.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="price">Offered Price per Share</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={offeredPrice}
                  onChange={(e) => setOfferedPrice(e.target.value)}
                  placeholder="Enter price per share"
                />
              </div>
              <div>
                <Label htmlFor="expires">Expires in (hours)</Label>
                <Input
                  id="expires"
                  type="number"
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(e.target.value)}
                  placeholder="24"
                />
              </div>
              <div>
                <Label>Target Users (leave empty for all users)</Label>
                <Select
                  value=""
                  onValueChange={(userId: string) => {
                    if (!targetUsers.includes(userId)) {
                      setTargetUsers([...targetUsers, userId]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add specific users" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u) => !isUserBanned(u))
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.username} ({user.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {targetUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {targetUsers.map((userId) => {
                      const user = users.find((u) => u.id === userId);
                      return (
                        <Badge key={userId} variant="secondary">
                          {user?.username}
                          <button
                            onClick={() =>
                              setTargetUsers(
                                targetUsers.filter((id) => id !== userId)
                              )
                            }
                            className="ml-1 text-xs"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateBuyback}>Create Offer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {buybackOffers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No buyback offers yet.</p>
            </CardContent>
          </Card>
        ) : (
          buybackOffers.map((offer) => {
            const stock = stocks.find((s) => s.id === offer.stockId);
            if (!stock) return null;

            return (
              <Card key={offer.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                        <Image
                          src={stock.imageUrl || "/placeholder.svg"}
                          alt={stock.characterName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold">{stock.characterName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {stock.anime}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusColor(offer.status)}>
                            {getStatusIcon(offer.status)}
                            <span className="ml-1 capitalize">
                              {offer.status}
                            </span>
                          </Badge>
                          {offer.targetUsers && (
                            <Badge variant="outline">
                              <Users className="h-3 w-3 mr-1" />
                              Targeted
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        ${offer.offeredPrice.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">per share</p>
                      {offer.acceptedShares && (
                        <p className="text-sm text-green-600">
                          {offer.acceptedShares} shares accepted
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Expires: {offer.expiresAt.toLocaleString()}</span>
                      <span>Created: {offer.expiresAt.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
