"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { cn, formatCurrencySmart } from "@/lib/utils";
import type { Stock } from "@/lib/types";

type OptionStatsCardProps = {
  stock: Stock;
  expiryDays?: number;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

export function OptionStatsCard({
  stock,
  expiryDays,
  subtitle,
  children,
  className,
}: OptionStatsCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-muted">
          <Image
            src={stock.imageUrl || "/placeholder.svg"}
            alt={stock.characterName}
            fill
            className="object-cover"
            sizes="56px"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {stock.characterName}
          </p>
          <p className="text-xs text-muted-foreground">{stock.anime}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs uppercase text-muted-foreground">Spot price</p>
          <p className="text-lg font-semibold text-foreground">
            {formatCurrencySmart(stock.currentPrice)}
          </p>
        </div>
      </div>
      {expiryDays !== undefined && (
        <div className="mt-3 flex items-center justify-between text-xs uppercase text-muted-foreground">
          <span>{expiryDays} day expiry</span>
          <span className="text-emerald-500">Live window</span>
        </div>
      )}
      {subtitle && (
        <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
      )}
      {children}
    </div>
  );
}
