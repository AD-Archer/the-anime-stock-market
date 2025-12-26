import { MetadataRoute } from "next";
import { generateAnimeSlug } from "@/lib/utils";

const canUseAppwrite = () =>
  Boolean(
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT &&
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  );

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";
  const defaultOg = `${baseUrl}/icons/images.jpg`;

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
          const image = s?.animeImageUrl
            ? s.animeImageUrl.startsWith("http")
              ? s.animeImageUrl
              : `${baseUrl}${s.animeImageUrl}`
            : defaultOg;
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
            stats.image = s.animeImageUrl.startsWith("http")
              ? s.animeImageUrl
              : `${baseUrl}${s.animeImageUrl}`;
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
    ...stocks.map((stock) => ({
      url: `${baseUrl}/anime/${stock.id}`,
      lastModified: stock.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: [
        stock.imageUrl?.startsWith("http")
          ? stock.imageUrl
          : `${baseUrl}${stock.imageUrl || ""}` || defaultOg,
      ],
    })),
    ...stocks.map((stock) => ({
      url: `${baseUrl}/character/${stock.id}`,
      lastModified: stock.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: [
        stock.imageUrl?.startsWith("http")
          ? stock.imageUrl
          : `${baseUrl}${stock.imageUrl || ""}` || defaultOg,
      ],
    })),
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
  return [...staticPages, ...topAnimePages, ...dynamicPages];
}
