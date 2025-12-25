"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export function TruncatedText({ text, maxLength = 300, className = "" }: TruncatedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text || text.length <= maxLength) {
    return <p className={className}>{text}</p>;
  }

  const truncatedText = text.slice(0, maxLength).trim();
  const lastSpaceIndex = truncatedText.lastIndexOf(' ');
  const finalTruncatedText = lastSpaceIndex > maxLength * 0.8 
    ? truncatedText.slice(0, lastSpaceIndex) 
    : truncatedText;

  return (
    <div className={className}>
      <p>
        {isExpanded ? text : `${finalTruncatedText}...`}
        <Button
          variant="link"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0 h-auto text-primary ml-1"
        >
          {isExpanded ? (
            <>
              Show less <ChevronUp className="ml-1 h-3 w-3" />
            </>
          ) : (
            <>
              Show more <ChevronDown className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </p>
    </div>
  );
}