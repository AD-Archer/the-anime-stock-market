import * as React from "react";

import { cn } from "@/lib/utils";

type SkeletonProps = React.ComponentProps<"div"> & {
  shimmer?: boolean;
};

export function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-muted",
        shimmer && "relative overflow-hidden",
        shimmer &&
          "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent before:animate-[shimmer_1.4s_infinite]",
        className
      )}
      {...props}
    />
  );
}
