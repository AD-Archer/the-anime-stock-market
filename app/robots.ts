import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/market", "/anime", "/leaderboard", "/character", "/options"],
        disallow: [
          "/admin/",
          "/auth/",
          "/api/",
          "/portfolio/",
          "/messages/",
          "/jail/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/market", "/anime", "/leaderboard", "/character"],
        crawlDelay: 0.5,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
