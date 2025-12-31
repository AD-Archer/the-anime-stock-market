import { MetadataRoute } from "next";
import { generateAnimeSlug, generateCharacterSlug } from "@/lib/utils";

const canUseAppwrite = () =>
  Boolean(
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT &&
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  );

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";
  const defaultOg = `${baseUrl}/icons/images.jpg`;

  // Normalize image URLs (handle absolute, protocol-relative `//`, and relative paths)
  function resolveImageUrl(
    url: string | undefined | null,
    baseUrl: string,
    fallback: string
  ): string {
    if (!url) return fallback;
    const trimmed = url.trim();
    try {
      // protocol-relative (//cdn.example.com/..)
      if (trimmed.startsWith("//")) {
        const proto = new URL(baseUrl).protocol || "https:";
        return `${proto}${trimmed}`;
      }
      // already absolute with http/https
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
    } catch (e) {
      // If URL parsing fails, fall back to safe defaults
      if (trimmed.startsWith("//")) return `https:${trimmed}`;
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
    }

    // relative path -> prefix with baseUrl
    return `${baseUrl.replace(/\/$/, "")}${
      trimmed.startsWith("/") ? trimmed : `/${trimmed}`
    }`;
  }

  const staticPages: MetadataRoute.Sitemap = [
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
      url: `${baseUrl}/portfolio`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/anime`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/messages`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/admin`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
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
    {
      url: `${baseUrl}/auth/signin`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  // Fetch dynamic pages and compute top anime activity
  let stocks: any[] = [];
  let users: any[] = [];
  // topAnimePages will contain entries for the top 50 most-active anime
  let topAnimePages: MetadataRoute.Sitemap = [];

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

      // Try to use DB-side aggregation of anime activity first
      try {
        const top = await activityService.getTopAnimeActivity(50);
        // Map slugs to stock-derived metadata (image/createdAt)
        const stockBySlug = new Map(
          stocks.map((s) => [generateAnimeSlug(s.anime || ""), s])
        );

        topAnimePages = top.map((a) => {
          const s = stockBySlug.get(a.slug);
          const image = resolveImageUrl(s?.animeImageUrl, baseUrl, defaultOg);
          return {
            url: `${baseUrl}/anime/${a.slug}`,
            lastModified: s?.createdAt || new Date(),
            changeFrequency:
              a.count >= 1000 ? "hourly" : a.count >= 100 ? "daily" : "weekly",
            priority: 0.85,
            images: [image],
          };
        });
      } catch (err) {
        // Fall back to previous in-process aggregation if DB-side fails
        console.warn("DB-side aggregation failed, falling back:", err);

        // Fetch transactions to compute activity by anime
        let transactions: any[] = [];
        try {
          transactions = await transactionService.getAll();
        } catch (err) {
          console.warn(
            "Failed to fetch transactions for sitemap activity:",
            err
          );
        }

        // Build lookup and aggregate counts per anime slug
        const stockById = new Map(stocks.map((s) => [s.id, s]));
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

        for (const tx of transactions) {
          const stock = stockById.get(tx.stockId);
          if (!stock || !stock.anime) continue;
          const stats = ensureAnime(stock.anime);
          stats.count += 1;
          const ts = tx.timestamp ? new Date(tx.timestamp) : null;
          if (ts && (!stats.lastModified || ts > stats.lastModified)) {
            stats.lastModified = ts;
          }
        }

        // Ensure every anime from stocks is present and capture createdAt/image
        for (const s of stocks) {
          if (!s.anime) continue;
          const stats = ensureAnime(s.anime);
          const created = s.createdAt ? new Date(s.createdAt) : null;
          if (
            !stats.lastModified ||
            (created && created > stats.lastModified)
          ) {
            stats.lastModified = created;
          }
          if (!stats.image && s.animeImageUrl) {
            stats.image = resolveImageUrl(s.animeImageUrl, baseUrl, defaultOg);
          }
        }

        // Pick the top 50 by transaction count
        const topAnime = Array.from(animeStats.values())
          .sort((a, b) => (b.count || 0) - (a.count || 0))
          .slice(0, 50);

        topAnimePages = topAnime.map((a) => ({
          url: `${baseUrl}/anime/${a.slug}`,
          lastModified: a.lastModified || new Date(),
          changeFrequency:
            a.count >= 1000 ? "hourly" : a.count >= 100 ? "daily" : "weekly",
          priority: 0.85,
          images: [a.image || defaultOg],
        }));
      }
    } catch (error) {
      console.warn("Failed to fetch dynamic data for sitemap:", error);
    }
  }

  const dynamicPages: MetadataRoute.Sitemap = [
    ...stocks.map((stock) => {
      // Calculate activity level for this stock
      const stockTransactions =
        stocks.length > 0
          ? stocks.reduce((count, s) => count + (s.id === stock.id ? 1 : 0), 0)
          : 0;
      const changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] =
        stockTransactions > 100
          ? "daily"
          : stockTransactions > 10
          ? "weekly"
          : "monthly";
      const priority = Math.min(0.8, 0.5 + (stockTransactions / 500) * 0.3);

      const characterSlug =
        stock.characterSlug ?? generateCharacterSlug(stock.characterName);
      return {
        url: `${baseUrl}/character/${encodeURIComponent(characterSlug)}`,
        lastModified: stock.createdAt,
        changeFrequency: changeFrequency,
        priority,
        images: [resolveImageUrl(stock.imageUrl, baseUrl, defaultOg)],
      };
    }),
    ...users.map((user) => ({
      url: `${baseUrl}/users/${encodeURIComponent(
        (user as any).displaySlug || user.username
      )}`,
      lastModified: user.createdAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
      images: [defaultOg],
    })),
  ];

  // Include top anime pages first so search engines see the most active anime
  // Also include a page for every anime derived from stocks (avoid duplicates)
  const topSlugs = new Set(
    topAnimePages.map((p) => p.url.replace(`${baseUrl}/anime/`, ""))
  );
  const allAnimePages: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();
  for (const s of stocks) {
    if (!s.anime) continue;
    const slug = generateAnimeSlug(s.anime);
    if (seen.has(slug) || topSlugs.has(slug)) {
      seen.add(slug);
      continue;
    }
    seen.add(slug);
    const image = s.animeImageUrl
      ? resolveImageUrl(s.animeImageUrl, baseUrl, defaultOg)
      : defaultOg;
    const lastModified = s.createdAt || new Date();
    allAnimePages.push({
      url: `${baseUrl}/anime/${slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
      images: [image],
    });
  }

  return [...staticPages, ...topAnimePages, ...allAnimePages, ...dynamicPages];
}
