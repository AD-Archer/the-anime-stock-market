"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

interface ContentModerationProps {
  children: React.ReactNode;
  type: "nsfw" | "spoiler";
  reason?: string;
  defaultHidden?: boolean;
}

export function ContentModeration({
  children,
  type,
  reason,
  defaultHidden = true,
}: ContentModerationProps) {
  const [isRevealed, setIsRevealed] = useState(!defaultHidden);

  if (isRevealed) {
    return (
      <div className="relative">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {type.toUpperCase()} {reason && `- ${reason}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsRevealed(false)}
            className="h-6 px-2 text-xs"
          >
            <EyeOff className="h-3 w-3 mr-1" />
            Hide
          </Button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-muted/50 border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {type === "nsfw" ? "NSFW Content" : "Spoiler Content"}
          </span>
        </div>
        {reason && (
          <p className="text-xs text-muted-foreground mb-3">{reason}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsRevealed(true)}
          className="text-xs"
        >
          <Eye className="h-3 w-3 mr-1" />
          Reveal {type === "nsfw" ? "NSFW" : "Spoiler"} Content
        </Button>
      </div>
    </div>
  );
}
