"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import Image from "next/image";
import type { Portfolio } from "@/lib/types";

interface BuybackNotificationProps {
  buybackOffer: {
    id: string;
    stockId: string;
    offeredPrice: number;
    offeredBy: string;
    expiresAt: Date;
  };
  onClose: () => void;
}

export function BuybackNotification({
  buybackOffer,
  onClose,
}: BuybackNotificationProps) {
  const {
    stocks,
    currentUser,
    acceptBuybackOffer,
    declineBuybackOffer,
    getUserPortfolio,
  } = useStore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const stock = stocks.find((s) => s.id === buybackOffer.stockId);
  if (!stock) return null;

  const userPortfolio = currentUser ? getUserPortfolio(currentUser.id) : [];
  const userShares =
    userPortfolio.find((p) => p.stockId === stock.id)?.shares || 0;

  const handleAccept = async () => {
    if (!currentUser || userShares === 0) return;

    setIsProcessing(true);
    try {
      acceptBuybackOffer(buybackOffer.id, userShares);
      toast({
        title: "Buyback Accepted",
        description: `You sold ${userShares} shares of ${
          stock.characterName
        } at $${buybackOffer.offeredPrice.toFixed(2)} each.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept buyback offer.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = () => {
    declineBuybackOffer(buybackOffer.id);
    toast({
      title: "Buyback Declined",
      description: "The buyback offer has been declined.",
    });
    onClose();
  };

  const profitLoss =
    (buybackOffer.offeredPrice -
      (userPortfolio.find((p: Portfolio) => p.stockId === stock.id)
        ?.averageBuyPrice || 0)) *
    userShares;
  const isProfit = profitLoss >= 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Buyback Offer
          </DialogTitle>
          <DialogDescription>
            An admin is offering to buy back your shares at a special price.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="relative h-16 w-16 overflow-hidden rounded-lg">
              <Image
                src={stock.imageUrl || "/placeholder.svg"}
                alt={stock.characterName}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">
                {stock.characterName}
              </h3>
              <p className="text-sm text-muted-foreground">{stock.anime}</p>
              <p className="text-xs text-muted-foreground">
                You own: {userShares} shares
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Offered Price</p>
              <p className="text-lg font-bold text-primary">
                ${buybackOffer.offeredPrice.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Your P/L</p>
              <div
                className={`flex items-center justify-center gap-1 ${
                  isProfit ? "text-chart-4" : "text-destructive"
                }`}
              >
                {isProfit ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-bold">
                  {isProfit ? "+" : ""}${profitLoss.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            Offer expires: {buybackOffer.expiresAt.toLocaleString()}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={isProcessing}
          >
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={isProcessing || userShares === 0}
          >
            Accept Buyback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
