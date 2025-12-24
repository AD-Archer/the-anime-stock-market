import { MetadataRoute } from 'next'

const canUseAppwrite = () =>
  Boolean(
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT &&
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  )

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://animestockexchange.com'

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/market`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/portfolio`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/anime`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/messages`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/admin`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/auth/signin`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ]

  // Fetch dynamic pages
  let stocks: any[] = []
  let users: any[] = []
  if (canUseAppwrite()) {
    try {
      const [{ stockService }, { userService }] = await Promise.all([
        import('@/lib/database/stockService'),
        import('@/lib/database/userService'),
      ])

      stocks = await stockService.getAll()
      users = await userService.getAll()
    } catch (error) {
      console.warn('Failed to fetch dynamic data for sitemap:', error)
    }
  }

  const dynamicPages: MetadataRoute.Sitemap = [
    ...stocks.map((stock) => ({
      url: `${baseUrl}/anime/${stock.id}`,
      lastModified: stock.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...stocks.map((stock) => ({
      url: `${baseUrl}/character/${stock.id}`,
      lastModified: stock.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...users.map((user) => ({
      url: `${baseUrl}/users/${encodeURIComponent(
        (user as any).displaySlug || user.username
      )}`,
      lastModified: user.createdAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ]

  return [...staticPages, ...dynamicPages]
}
