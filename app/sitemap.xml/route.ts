import { generateRuntimeSitemap, renderSitemapXml } from "@/lib/runtime-sitemap";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { entries } = await generateRuntimeSitemap(req);
  const xml = renderSitemapXml(entries);

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

