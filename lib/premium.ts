import type {
  MediaType,
  PremiumComboMode,
  PremiumMeta,
  PremiumDonationEntry,
} from "./types";

export const DEFAULT_PREMIUM_META: PremiumMeta = {
  isPremium: false,
  premiumSince: null,
  charactersAddedToday: 0,
  charactersAddedTodayAnime: 0,
  charactersAddedTodayManga: 0,
  charactersDuplicateToday: 0,
  quotaResetAt: null,
  autoAdd: true,
  comboMode: "standard",
  tierLevel: undefined,
  donationAmount: undefined,
  donationDate: null,
  donationHistory: [],
  lastPremiumRewardClaim: null,
};

export type PremiumQuotaConfig = {
  total: number;
  anime: number;
  manga: number;
};

export const PREMIUM_QUOTA_CONFIG: Record<
  PremiumComboMode,
  PremiumQuotaConfig
> = {
  standard: { total: 50, anime: 50, manga: 50 },
  "anime-1-manga-1": { total: 2, anime: 1, manga: 1 },
  "anime-2-manga-2": { total: 4, anime: 2, manga: 2 },
};

export const PREMIUM_COMBO_OPTIONS: {
  label: string;
  description: string;
  value: PremiumComboMode;
}[] = [
  {
    label: "Standard (50 characters/day)",
    description: "Any mix of anime or manga characters up to 50 total.",
    value: "standard",
  },
  {
    label: "Anime 1 / Manga 1",
    description: "Add up to 1 anime and 1 manga character per day.",
    value: "anime-1-manga-1",
  },
  {
    label: "Anime 2 / Manga 2",
    description: "Add up to 2 anime and 2 manga characters per day.",
    value: "anime-2-manga-2",
  },
];

export type PremiumTier = {
  level: 1 | 2 | 3 | 4;
  label: string;
  characterLimit: number;
  reward: number;
  donationRequirement: number;
};

export const PREMIUM_TIERS: PremiumTier[] = [
  {
    level: 1,
    label: "Tier 1",
    characterLimit: 50,
    reward: 50,
    donationRequirement: 5,
  },
  {
    level: 2,
    label: "Tier 2",
    characterLimit: 150,
    reward: 150,
    donationRequirement: 10,
  },
  {
    level: 3,
    label: "Tier 3",
    characterLimit: 300,
    reward: 300,
    donationRequirement: 20,
  },
  {
    level: 4,
    label: "Tier 4",
    characterLimit: 1000,
    reward: 1000,
    donationRequirement: 30,
  },
];

const TIERS_BY_LEVEL: Record<PremiumTier["level"], PremiumTier> =
  PREMIUM_TIERS.reduce((acc, tier) => {
    acc[tier.level] = tier;
    return acc;
  }, {} as Record<PremiumTier["level"], PremiumTier>);

export function getPremiumTierByLevel(
  level?: PremiumTier["level"]
): PremiumTier | undefined {
  if (!level) return undefined;
  return TIERS_BY_LEVEL[level];
}

export function getPremiumTierByDonation(
  amount?: number
): PremiumTier | undefined {
  if (!amount) return undefined;
  return (
    [...PREMIUM_TIERS].reverse().find(
      (tier) => amount >= tier.donationRequirement
    ) ?? undefined
  );
}

export function getTierForMeta(meta?: PremiumMeta): PremiumTier | undefined {
  if (!meta) return undefined;
  const tierFromLevel = meta.tierLevel
    ? getPremiumTierByLevel(meta.tierLevel as PremiumTier["level"])
    : undefined;
  const monthlyTotal = getMonthlyDonationTotal(meta);
  const donationForTier =
    monthlyTotal > 0 ? monthlyTotal : meta.donationAmount;
  return tierFromLevel ?? getPremiumTierByDonation(donationForTier);
}

const getDonationMonthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

export function getDonationsForMonth(
  meta?: PremiumMeta,
  referenceDate = new Date()
): PremiumDonationEntry[] {
  return getDonationsForMonthFromHistory(meta?.donationHistory, referenceDate);
}

export function getDonationsForMonthFromHistory(
  history: PremiumDonationEntry[] | undefined,
  referenceDate = new Date()
): PremiumDonationEntry[] {
  if (!history || history.length === 0) return [];
  const key = getDonationMonthKey(referenceDate);
  return history.filter(
    (entry) => getDonationMonthKey(entry.date) === key
  );
}

export function getMonthlyDonationTotal(
  meta?: PremiumMeta,
  referenceDate = new Date()
): number {
  return getDonationsForMonth(meta, referenceDate).reduce(
    (total, entry) => total + entry.amount,
    0
  );
}

export function getMonthlyDonationTotalFromHistory(
  history: PremiumDonationEntry[] | undefined,
  referenceDate = new Date()
): number {
  return getDonationsForMonthFromHistory(history, referenceDate).reduce(
    (total, entry) => total + entry.amount,
    0
  );
}

export function isSameDonationMonth(a: Date, b: Date): boolean {
  return getDonationMonthKey(a) === getDonationMonthKey(b);
}

export function getLatestDonation(
  meta?: PremiumMeta
): PremiumDonationEntry | undefined {
  const history = meta?.donationHistory;
  if (!history || history.length === 0) return undefined;
  return [...history].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  )[0];
}

export function getTotalDonations(meta?: PremiumMeta): number {
  const history = meta?.donationHistory;
  if (!history || history.length === 0) return 0;
  return history.reduce((total, entry) => total + entry.amount, 0);
}

export interface PremiumQuotaStatus {
  totalLimit: number;
  animeLimit: number;
  mangaLimit: number;
  totalUsed: number;
  animeUsed: number;
  mangaUsed: number;
  totalRemaining: number;
  animeRemaining: number;
  mangaRemaining: number;
  comboMode: PremiumComboMode;
  resetAt: Date;
  tier?: PremiumTier;
  tierLevel?: PremiumTier["level"];
}

export function getNextQuotaResetDate(now = new Date()): Date {
  const reset = new Date(now);
  reset.setUTCHours(0, 0, 0, 0);
  reset.setUTCDate(reset.getUTCDate() + 1);
  return reset;
}

const toDateValue = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

function normalizePremiumMeta(meta?: PremiumMeta, now = new Date()) {
  const base: PremiumMeta = {
    ...DEFAULT_PREMIUM_META,
    ...meta,
  };
  const since = meta?.premiumSince
    ? toDateValue(meta.premiumSince)
    : base.premiumSince;
  const quotaDate =
    meta?.quotaResetAt !== undefined && meta?.quotaResetAt !== null
      ? toDateValue(meta.quotaResetAt)
      : base.quotaResetAt;

  const shouldReset = !quotaDate || quotaDate <= now;
  const resetAt = shouldReset
    ? getNextQuotaResetDate(now)
    : quotaDate ?? getNextQuotaResetDate(now);

  const normalized: PremiumMeta = {
    ...base,
    premiumSince: since,
    quotaResetAt: resetAt,
  };

  if (shouldReset) {
    normalized.charactersAddedToday = 0;
    normalized.charactersAddedTodayAnime = 0;
    normalized.charactersAddedTodayManga = 0;
    normalized.charactersDuplicateToday = 0;
  }

  return { normalized, resetAt };
}

export function getPremiumQuotaStatus(
  meta?: PremiumMeta,
  now = new Date()
): PremiumQuotaStatus {
  const { normalized, resetAt } = normalizePremiumMeta(meta, now);
  const comboMode = normalized.comboMode || "standard";
  const config = PREMIUM_QUOTA_CONFIG[comboMode];
  const tier = getTierForMeta(normalized);
  const totalUsed = normalized.charactersAddedToday ?? 0;
  const animeUsed = normalized.charactersAddedTodayAnime ?? 0;
  const mangaUsed = normalized.charactersAddedTodayManga ?? 0;

  const totalLimit = tier?.characterLimit ?? config.total;
  const animeLimit = tier?.characterLimit ?? config.anime;
  const mangaLimit = tier?.characterLimit ?? config.manga;

  const totalRemaining = Math.max(0, totalLimit - totalUsed);
  const animeRemaining = Math.max(0, animeLimit - animeUsed);
  const mangaRemaining = Math.max(0, mangaLimit - mangaUsed);

  return {
    totalLimit,
    animeLimit,
    mangaLimit,
    totalUsed,
    animeUsed,
    mangaUsed,
    totalRemaining,
    animeRemaining,
    mangaRemaining,
    comboMode,
    resetAt,
    tier,
    tierLevel: tier?.level,
  };
}

export function canAddPremiumCharacter(
  meta: PremiumMeta | undefined,
  mediaType: MediaType,
  now = new Date()
): { allowed: boolean; reason?: string; normalized: PremiumMeta } {
  const { normalized } = normalizePremiumMeta(meta, now);
  const comboMode = normalized.comboMode || "standard";
  const config = PREMIUM_QUOTA_CONFIG[comboMode];
  const tier = getTierForMeta(normalized);
  const totalUsed = normalized.charactersAddedToday ?? 0;
  const animeUsed = normalized.charactersAddedTodayAnime ?? 0;
  const mangaUsed = normalized.charactersAddedTodayManga ?? 0;

  const totalLimit = tier?.characterLimit ?? config.total;
  if (totalUsed >= totalLimit) {
    return {
      allowed: false,
      reason: "Daily premium character cap reached.",
      normalized,
    };
  }

  const typeUsed = mediaType === "anime" ? animeUsed : mangaUsed;
  const typeLimit =
    tier?.characterLimit ?? (mediaType === "anime" ? config.anime : config.manga);
  if (typeUsed >= typeLimit) {
    return {
      allowed: false,
      reason: `Daily ${mediaType} allowance reached for your combo.`,
      normalized,
    };
  }

  return { allowed: true, normalized };
}

export function incrementPremiumMeta(
  meta: PremiumMeta | undefined,
  mediaType: MediaType,
  now = new Date()
): PremiumMeta {
  return incrementPremiumMetaBy(meta, mediaType, 1, 0, now);
}

export function incrementPremiumMetaBy(
  meta: PremiumMeta | undefined,
  mediaType: MediaType,
  addedCount: number,
  duplicateCount = 0,
  now = new Date()
): PremiumMeta {
  const { normalized } = normalizePremiumMeta(meta, now);
  const animeUsed = normalized.charactersAddedTodayAnime ?? 0;
  const mangaUsed = normalized.charactersAddedTodayManga ?? 0;
  const totalUsed = normalized.charactersAddedToday ?? 0;
  const duplicateUsed = normalized.charactersDuplicateToday ?? 0;
  const safeAdded = Number.isFinite(addedCount) ? Math.max(0, addedCount) : 0;
  const safeDuplicate = Number.isFinite(duplicateCount)
    ? Math.max(0, duplicateCount)
    : 0;

  return {
    ...normalized,
    charactersAddedToday: totalUsed + safeAdded,
    charactersAddedTodayAnime:
      mediaType === "anime" ? animeUsed + safeAdded : animeUsed,
    charactersAddedTodayManga:
      mediaType === "manga" ? mangaUsed + safeAdded : mangaUsed,
    charactersDuplicateToday: duplicateUsed + safeDuplicate,
    quotaResetAt: normalized.quotaResetAt ?? getNextQuotaResetDate(now),
  };
}
