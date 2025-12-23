"use client";

import React from "react";
import { MarketTicker } from "@/components/market-ticker";

export function SiteStickyTicker() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="backdrop-blur-sm bg-background/80 border-b">
        <div className="container mx-auto px-4 py-2">
          {/* Compact ticker to fit as a sticky header */}
          <div className="h-10 md:h-14">
            <MarketTicker limit={12} duration={20} />
          </div>
        </div>
      </div>
    </div>
  );
}
