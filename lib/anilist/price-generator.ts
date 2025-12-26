/**
 * Price and shares generation for initial stock creation
 * Based on AniList ranking and popularity
 */

interface RankingInfo {
  rank?: number;
  type?: string;
  allTime?: boolean;
}

/**
 * Generate initial price based on ranking
 * Higher ranked (lower rank number) = higher initial price
 * Rank 1-100: $50-$200
 * Rank 101-500: $25-$50
 * Rank 501+: $5-$25
 * No rank: $10-$30
 */
export function generateInitialPrice(rankingInfo?: RankingInfo): number {
  if (!rankingInfo?.rank) {
    // No ranking data - random price between $10-$30
    return parseFloat((Math.random() * 20 + 10).toFixed(2));
  }

  const rank = rankingInfo.rank;

  if (rank <= 100) {
    // Top 100 - premium prices
    const price = Math.random() * 150 + 50; // $50-$200
    return parseFloat(price.toFixed(2));
  } else if (rank <= 500) {
    // Top 500 - medium prices
    const price = Math.random() * 25 + 25; // $25-$50
    return parseFloat(price.toFixed(2));
  } else {
    // Beyond top 500 - budget prices
    const price = Math.random() * 20 + 5; // $5-$25
    return parseFloat(price.toFixed(2));
  }
}

/**
 * Generate total shares based on ranking
 * Popular characters (top ranked) have fewer total shares (rarity)
 * Less popular characters have more shares available
 * Rank 1-100: 1500-2500 shares
 * Rank 101-500: 2500-4000 shares
 * Rank 501+: 4000-6000 shares
 * No rank: 3000-5000 shares
 */
export function generateTotalShares(rankingInfo?: RankingInfo): number {
  if (!rankingInfo?.rank) {
    // No ranking data - medium availability
    return Math.floor(Math.random() * 2000 + 3000); // 3000-5000
  }

  const rank = rankingInfo.rank;

  if (rank <= 100) {
    // Top 100 - very limited supply (rarer)
    return Math.floor(Math.random() * 1000 + 1500); // 1500-2500
  } else if (rank <= 500) {
    // Top 500 - moderate supply
    return Math.floor(Math.random() * 1500 + 2500); // 2500-4000
  } else {
    // Beyond top 500 - abundant supply
    return Math.floor(Math.random() * 2000 + 4000); // 4000-6000
  }
}

/**
 * Generate available shares (initially same as total)
 */
export function generateAvailableShares(totalShares: number): number {
  return totalShares;
}

/**
 * Generate a complete stock pricing configuration
 */
export function generateStockPricing(rankingInfo?: RankingInfo) {
  const currentPrice = generateInitialPrice(rankingInfo);
  const totalShares = generateTotalShares(rankingInfo);
  const availableShares = generateAvailableShares(totalShares);

  return {
    currentPrice,
    totalShares,
    availableShares,
  };
}
