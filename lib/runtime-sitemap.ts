import { resolvePublicSiteUrl } from "./site-url";
import type { Stock, User } from "./types";
import { generateAnimeSlug, generateCharacterSlug } from "./utils";

export type SitemapEntry = {
  url: string;
  lastModified?: Date | string | null;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  images?: string[];
};

export type RuntimeSitemapResult = {
  entries: SitemapEntry[];
  stats: {
    generatedAt: string;
    baseUrl: string;
    usedAppwrite: boolean;
    stockCount: number;
    userCount: number;
    staticCount: number;
    topAnimeCount: number;
    animeCount: number;
    characterCount: number;
    userPageCount: number;
    totalCount: number;
  };
};

const canUseAppwrite = () =>
  Boolean(
    (process.env.APPWRITE_ENDPOINT ||
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) &&
      (process.env.APPWRITE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) &&
      (process.env.APPWRITE_DATABASE_ID ||
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID)
  );

function resolveImageUrl(
  url: string | undefined | null,
  baseUrl: string,
  fallback: string
): string {
  if (!url) return fallback;
  const trimmed = url.trim();
  try {
    if (trimmed.startsWith("//")) {
      const proto = new URL(baseUrl).protocol || "https:";
      return `${proto}${trimmed}`;
    }
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
  } catch {
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
  }

  return `${baseUrl.replace(/\/$/, "")}${
    trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  }`;
}

function toIsoDate(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderSitemapXml(entries: SitemapEntry[]): string {
  const body = entries
    .map((entry) => {
      const lastModified = toIsoDate(entry.lastModified);
      const images = (entry.images || [])
        .filter(Boolean)
        .map(
          (image) =>
            `<image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`
        )
        .join("");

      return [
        "<url>",
        `<loc>${escapeXml(entry.url)}</loc>`,
        images,
        lastModified ? `<lastmod>${lastModified}</lastmod>` : "",
        entry.changeFrequency
          ? `<changefreq>${entry.changeFrequency}</changefreq>`
          : "",
        typeof entry.priority === "number"
          ? `<priority>${entry.priority}</priority>`
          : "",
        "</url>",
      ].join("");
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">` +
    body +
    `</urlset>`;
}

export async function generateRuntimeSitemap(
  req?: Request
): Promise<RuntimeSitemapResult> {
  const baseUrl = resolvePublicSiteUrl(req);
  const defaultOg = `${baseUrl}/icons/images.jpg`;

  const staticPages: SitemapEntry[] = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
      images: [defaultOg],
    },
    {
      url: `${baseUrl}/market`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
      images: [defaultOg],
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/anime`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/options`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/donate`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  let stocks: Stock[] = [];
  let users: User[] = [];
  let topAnimePages: SitemapEntry[] = [];

  if (canUseAppwrite()) {
    try {
      const [
        { stockService },
        { userService },
        { transactionService },
        { activityService },
      ] = await Promise.all([
        import("@/lib/database/stockService"),
        import("@/lib/database/userService"),
        import("@/lib/database/transactionService"),
        import("@/lib/database/activityService"),
      ]);

      stocks = await stockService.getAll();
      users = await userService.getAll();

      if (stocks.length === 0) {
        console.warn(
          "Runtime sitemap stock fetch returned 0 records; character and anime detail pages will be omitted."
        );
      }

      try {
        const top = await activityService.getTopAnimeActivity(50);
        const stockBySlug = new Map(
          stocks.map((stock) => [generateAnimeSlug(stock.anime || ""), stock])
        );

        topAnimePages = top.map((anime) => {
          const stock = stockBySlug.get(anime.slug);
          const image = resolveImageUrl(
            stock?.animeImageUrl,
            baseUrl,
            defaultOg
          );
          return {
            url: `${baseUrl}/anime/${anime.slug}`,
            lastModified: stock?.createdAt || new Date(),
            changeFrequency:
              anime.count >= 1000
                ? "hourly"
                : anime.count >= 100
                ? "daily"
                : "weekly",
            priority: 0.85,
            images: [image],
          };
        });
      } catch (error) {
        console.warn(
          "Runtime sitemap DB-side anime aggregation failed, falling back:",
          error
        );

        let transactions: Array<{ stockId: string; timestamp?: Date | string }> =
          [];
        try {
          transactions = await transactionService.getAll();
        } catch (transactionError) {
          console.warn(
            "Failed to fetch transactions for runtime sitemap activity:",
            transactionError
          );
        }

        const stockById = new Map(stocks.map((stock) => [stock.id, stock]));
        const animeStats = new Map<
          string,
          {
            name: string;
            slug: string;
            count: number;
            lastModified: Date | null;
            image: string | null;
          }
        >();

        const ensureAnime = (animeName: string) => {
          const slug = generateAnimeSlug(animeName);
          if (!animeStats.has(slug)) {
            animeStats.set(slug, {
              name: animeName,
              slug,
              count: 0,
              lastModified: null,
              image: null,
            });
          }
          return animeStats.get(slug)!;
        };

        for (const transaction of transactions) {
          const stock = stockById.get(transaction.stockId);
          if (!stock?.anime) continue;
          const stats = ensureAnime(stock.anime);
          stats.count += 1;
          const timestamp = transaction.timestamp
            ? new Date(transaction.timestamp)
            : null;
          if (timestamp && (!stats.lastModified || timestamp > stats.lastModified)) {
            stats.lastModified = timestamp;
          }
        }

        for (const stock of stocks) {
          if (!stock.anime) continue;
          const stats = ensureAnime(stock.anime);
          const created = stock.createdAt ? new Date(stock.createdAt) : null;
          if (!stats.lastModified || (created && created > stats.lastModified)) {
            stats.lastModified = created;
          }
          if (!stats.image && stock.animeImageUrl) {
            stats.image = resolveImageUrl(stock.animeImageUrl, baseUrl, defaultOg);
          }
        }

        topAnimePages = Array.from(animeStats.values())
          .sort((a, b) => (b.count || 0) - (a.count || 0))
          .slice(0, 50)
          .map((anime) => ({
            url: `${baseUrl}/anime/${anime.slug}`,
            lastModified: anime.lastModified || new Date(),
            changeFrequency:
              anime.count >= 1000
                ? "hourly"
                : anime.count >= 100
                ? "daily"
                : "weekly",
            priority: 0.85,
            images: [anime.image || defaultOg],
          }));
      }
    } catch (error) {
      console.warn("Failed to fetch runtime sitemap data:", error);
    }
  }

  const characterPages: SitemapEntry[] = stocks.map((stock) => {
    const characterSlug =
      stock.characterSlug ?? generateCharacterSlug(stock.characterName);
    return {
      url: `${baseUrl}/character/${encodeURIComponent(characterSlug)}`,
      lastModified: stock.createdAt,
      changeFrequency: "weekly",
      priority: 0.6,
      images: [resolveImageUrl(stock.imageUrl, baseUrl, defaultOg)],
    };
  });

  const userPages: SitemapEntry[] = users.map((user) => ({
    url: `${baseUrl}/users/${encodeURIComponent(
      user.displaySlug || user.username
    )}`,
    lastModified: user.createdAt,
    changeFrequency: "monthly",
    priority: 0.5,
    images: [defaultOg],
  }));

  const topSlugs = new Set(
    topAnimePages.map((page) => page.url.replace(`${baseUrl}/anime/`, ""))
  );
  const seenAnimeSlugs = new Set<string>();
  const animePages: SitemapEntry[] = [];

  for (const stock of stocks) {
    if (!stock.anime) continue;
    const slug = generateAnimeSlug(stock.anime);
    if (seenAnimeSlugs.has(slug) || topSlugs.has(slug)) {
      seenAnimeSlugs.add(slug);
      continue;
    }

    seenAnimeSlugs.add(slug);
    animePages.push({
      url: `${baseUrl}/anime/${slug}`,
      lastModified: stock.createdAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
      images: [
        stock.animeImageUrl
          ? resolveImageUrl(stock.animeImageUrl, baseUrl, defaultOg)
          : defaultOg,
      ],
    });
  }

  const entries = [
    ...staticPages,
    ...topAnimePages,
    ...animePages,
    ...characterPages,
    ...userPages,
  ];

  return {
    entries,
    stats: {
      generatedAt: new Date().toISOString(),
      baseUrl,
      usedAppwrite: canUseAppwrite(),
      stockCount: stocks.length,
      userCount: users.length,
      staticCount: staticPages.length,
      topAnimeCount: topAnimePages.length,
      animeCount: animePages.length,
      characterCount: characterPages.length,
      userPageCount: userPages.length,
      totalCount: entries.length,
    },
  };
}

