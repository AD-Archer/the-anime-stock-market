/**
 * Slug generation and normalization utilities
 * Handles character names with spaces and duplicates
 */

/**
 * Convert character name to a URL-safe slug
 * Removes special characters, converts spaces to hyphens, lowercase
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Create a unique slug by appending a counter if needed
 * Used to differentiate between characters with the same name
 */
export function createUniqueSlug(
  name: string,
  existingSlugs: string[]
): string {
  const baseSlug = generateSlug(name);

  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  // Find the next available number
  let counter = 1;
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }

  return `${baseSlug}-${counter}`;
}

/**
 * Normalize character name for comparison
 * Used to detect duplicate characters with slightly different names
 */
export function normalizeForComparison(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w]/g, "") // Remove all non-word characters
    .replace(/\s+/g, ""); // Remove spaces
}

/**
 * Check if two character names are effectively the same
 */
export function isSameName(name1: string, name2: string): boolean {
  return normalizeForComparison(name1) === normalizeForComparison(name2);
}

/**
 * Extract a numeric suffix from a slug if present
 * For example: "tanjiro-1" -> 1, "tanjiro" -> null
 */
export function getSlugSuffix(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Get the base slug without numeric suffix
 * For example: "tanjiro-1" -> "tanjiro"
 */
export function getBaseSlug(slug: string): string {
  return slug.replace(/-\d+$/, "");
}
