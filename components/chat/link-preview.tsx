"use client";

import { useEffect, useMemo, useState } from "react";
import { SafeLink } from "@/components/chat/safe-link";
import { cn } from "@/lib/utils";

type OpenGraphData = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

type LinkPreviewProps = {
  url: string;
};

function LinkPreviewCard({ url }: LinkPreviewProps) {
  const [data, setData] = useState<OpenGraphData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        const response = await fetch(
          `/api/opengraph?url=${encodeURIComponent(url)}`
        );
        if (!response.ok) {
          setFailed(true);
          return;
        }
        const payload = (await response.json()) as OpenGraphData;
        if (!canceled) {
          setData(payload);
        }
      } catch {
        if (!canceled) setFailed(true);
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [url]);

  if (failed) return null;

  const display = data ?? {
    url,
    title: url,
  };
  const hostname = useMemo(() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }, [url]);

  return (
    <SafeLink
      href={url}
      className="block max-w-full overflow-hidden rounded-lg border bg-card hover:bg-muted/40 transition"
    >
      <div className="flex gap-3 p-3 min-w-0">
        {display.image && (
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            <img
              src={display.image}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {display.siteName || hostname}
          </p>
          <p className="text-sm font-medium break-words">
            {display.title || hostname}
          </p>
          {display.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 break-words">
              {display.description}
            </p>
          )}
        </div>
      </div>
    </SafeLink>
  );
}

export function LinkPreviewList({
  urls,
  className,
}: {
  urls: string[];
  className?: string;
}) {
  if (urls.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {urls.map((url) => (
        <LinkPreviewCard key={url} url={url} />
      ))}
    </div>
  );
}
