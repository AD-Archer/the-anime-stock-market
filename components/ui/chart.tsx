"use client";

import * as React from "react";
import type { TooltipContentProps, TooltipProps } from "recharts";
import { Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
  }
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue>({ config: {} });

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) {
  const style = React.useMemo(() => {
    const entries = Object.entries(config);
    const vars: Record<string, string> = {};
    entries.forEach(([key, value]) => {
      if (value?.color) {
        vars[`--color-${key}`] = value.color;
      }
    });
    return vars as React.CSSProperties;
  }, [config]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn("w-full", className)} style={style}>
        {children}
      </div>
    </ChartContext.Provider>
  );
}

export function ChartTooltip({ ...props }: TooltipProps<number, string>) {
  return <Tooltip {...props} />;
}

type ChartTooltipContentProps = Partial<
  TooltipContentProps<number, string>
> & { className?: string };

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
}: ChartTooltipContentProps) {
  const { config } = React.useContext(ChartContext);
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-3 py-2 text-xs shadow-sm",
        className
      )}
    >
      <p className="mb-2 font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => {
          const key = entry.dataKey ?? "";
          const labelText = config[key]?.label ?? String(key);
          const color = config[key]?.color ?? entry.color ?? "currentColor";
          return (
            <div key={String(key)} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground">{labelText}</span>
              <span className="ml-auto text-foreground">
                {entry.value?.toLocaleString?.() ?? entry.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
