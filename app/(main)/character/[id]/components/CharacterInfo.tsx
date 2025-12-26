"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { User } from "@/lib/types";
import {
  formatCompactNumber,
  formatCurrencyCompact,
  formatCurrencySmart,
} from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";

interface Props {
  stock: any;
  animeSlug: string;
  currentUser: User | null;
  userShares: number;
  priceChangePct?: number;
  onBuy: () => void;
  onSell: () => void;
}

export default function CharacterInfo({
  stock,
  animeSlug,
  currentUser,
  userShares,
  priceChangePct,
  onBuy,
  onSell,
}: Props) {
  return (
    <Card className="lg:col-span-1">
      <CardContent className="pt-6">
        <div className="relative mb-4 aspect-square overflow-hidden rounded-lg bg-muted">
          <Image
            src={stock.imageUrl || "/placeholder.svg"}
            alt={stock.characterName}
            fill
            className="object-cover"
          />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {stock.characterName}
        </h1>
        <p className="mb-4 text-muted-foreground">
          <Link
            href={`/anime/${animeSlug}`}
            className="hover:underline text-foreground"
          >
            {stock.anime}
          </Link>
        </p>
        <TruncatedText
          text={stock.description || ""}
          maxLength={300}
          className="mb-6 text-sm text-muted-foreground"
        />

        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Price</span>
            <span className="text-xl font-bold text-foreground break-all">
              {formatCurrencySmart(stock.currentPrice, {
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Price Change</span>
            <Badge
              variant={
                (priceChangePct ?? stock.priceChangePct ?? 0) >= 0
                  ? "default"
                  : "destructive"
              }
              className="gap-1"
            >
              {(priceChangePct ?? stock.priceChangePct ?? 0) >= 0 ? "+" : ""}
              {(priceChangePct ?? stock.priceChangePct ?? 0).toFixed(2)}%
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Available Shares
            </span>
            <span className="font-mono text-foreground">
              {formatCompactNumber(stock.availableShares)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Shares</span>
            <span className="font-mono text-foreground">
              {formatCompactNumber(stock.totalShares)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Market Cap</span>
            <span className="font-mono text-foreground break-all">
              {formatCurrencyCompact(stock.currentPrice * stock.totalShares)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Your Shares</span>
            <span className="font-mono text-foreground">
              {currentUser
                ? formatCompactNumber(userShares)
                : "Sign in to view"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onBuy}>Buy Shares</Button>
          <Button
            variant="outline"
            onClick={onSell}
            disabled={!currentUser || userShares <= 0}
          >
            Sell Shares
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
