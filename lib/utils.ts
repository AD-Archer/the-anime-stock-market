import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
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
