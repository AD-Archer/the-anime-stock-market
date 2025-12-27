import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Stock } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a short UUID-like ID suitable for Appwrite document IDs (max 36 chars)
 * Uses timestamp and random bytes for uniqueness
 */
export function generateShortId(): string {
  // Use a shorter format: 8 random hex chars + 4 from timestamp
  const timestamp = Date.now().toString(16).slice(-4);
  const random = Math.random().toString(16).slice(2, 10);
  return `${random}${timestamp}`;
}
/**
 * Generate a consistent URL slug from anime name
 * Converts to lowercase, replaces special chars with hyphens, collapses multiple hyphens
 */
export function generateAnimeSlug(animeName: string): string {
  return animeName
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-") // replace non-alphanumeric (except hyphens) with hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, ""); // remove leading/trailing hyphens
}

/**
 * Generate a consistent URL slug from character name
 * Uses the same normalization as anime slugs for consistency
 */
export function generateCharacterSlug(characterName: string): string {
  return generateAnimeSlug(characterName);
}

/**
 * Format a number using compact notation (e.g. 1.2K, 3.4M)
 */
export function formatCompactNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
    ...options,
  }).format(value);
}

/**
 * Format a currency value using compact notation with a narrow symbol.
 */
export function formatCurrencyCompact(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  // For extremely large numbers, use a cleaner format without commas
  if (Math.abs(value) >= 1000000000000000) {
    // 1 quadrillion
    const absValue = Math.abs(value);
    const sign = value < 0 ? "-" : "";

    if (absValue >= 1000000000000000000000) {
      // Sextillion+
      return `${sign}$${(absValue / 1000000000000000000000).toFixed(1)}S`;
    } else if (absValue >= 1000000000000000000) {
      // Quintillion+
      return `${sign}$${(absValue / 1000000000000000000).toFixed(1)}Q`;
    } else if (absValue >= 1000000000000000) {
      // Quadrillion+
      return `${sign}$${(absValue / 1000000000000000).toFixed(1)}T`;
    }
  }

  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    ...options,
  }).format(value);
}

/**
 * Format a currency value with standard notation and 2 decimal places.
 */
export function formatCurrency(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/**
 * Format a currency value with standard notation for small amounts and compact notation for large amounts.
 */
export function formatCurrencySmart(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  // Use compact notation for values >= 1000, standard for smaller values
  if (Math.abs(value) >= 1000) {
    return formatCurrencyCompact(value, options);
  } else {
    return formatCurrency(value, options);
  }
}

const clampValue = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export interface OptionChainEntry {
  stockId: string;
  strike: number;
  type: "call" | "put";
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  expiryDays: number;
}

export function generateOptionChain(
  stock: Stock,
  expiryDays: number
): OptionChainEntry[] {
  const normalizedDays = Math.max(1, Math.round(expiryDays));
  const timeFactor = Math.min(1, normalizedDays / 365);
  const baseIvPercent = 20 + timeFactor * 10;
  const strikeFactors = [0.75, 0.9, 1, 1.1, 1.25];
  const types: OptionChainEntry["type"][] = ["call", "put"];

  const entries: OptionChainEntry[] = strikeFactors
    .map((factor) => Number((stock.currentPrice * factor).toFixed(2)))
    .flatMap((strike) => {
      const moneyness = strike / stock.currentPrice;
      const deltaCallBase = clampValue(
        0.35 + (1 - moneyness) * 0.6,
        0.05,
        0.95
      );
      const deltaPutBase = clampValue(
        0.35 + (moneyness - 1) * 0.6,
        0.05,
        0.95
      );

      return types.map((type) => {
        const iv = Number(
          clampValue(baseIvPercent + Math.abs(moneyness - 1) * 30, 10, 70).toFixed(1)
        );
        const delta = type === "call" ? deltaCallBase : -deltaPutBase;
        const gamma = Number(
          clampValue(
            0.03 + (1 - Math.abs(moneyness - 1)) * 0.04 + timeFactor * 0.01,
            0.01,
            0.08
          ).toFixed(3)
        );
        const theta = Number(
          (
            -0.02 *
            (1 + normalizedDays / 30) *
            (type === "call" ? 1 : 1.05) *
            (1 + Math.abs(moneyness - 1) * 0.3)
          ).toFixed(3)
        );
        const vega = Number(
          clampValue(0.12 + timeFactor * 0.15 + Math.abs(moneyness - 1) * 0.1, 0.1, 0.8).toFixed(3)
        );

        return {
          stockId: stock.id,
          strike,
          type,
          iv,
          delta,
          gamma,
          theta,
          vega,
          expiryDays: normalizedDays,
        };
      });
    });

  return entries.sort((a, b) =>
    a.strike === b.strike
      ? a.type === "call" && b.type === "put"
        ? -1
        : 1
      : a.strike - b.strike
  );
}
