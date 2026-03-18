import {
  sanitizeIndexNowUrls,
  submitIndexNowUrls,
} from "../lib/indexnow";

function getSiteUrl(): string {
  const siteUrl =
    process.env.INDEXNOW_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error(
      "Set INDEXNOW_SITE_URL, SITE_URL, or NEXT_PUBLIC_SITE_URL before running this script."
    );
  }

  return siteUrl.replace(/\/$/, "");
}

function extractUrlsFromSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

async function main() {
  const siteUrl = getSiteUrl();
  const sitemapUrl = `${siteUrl}/sitemap.xml`;

  console.log(`Fetching sitemap from ${sitemapUrl}`);
  const sitemapResponse = await fetch(sitemapUrl, { cache: "no-store" });
  if (!sitemapResponse.ok) {
    throw new Error(
      `Failed to fetch sitemap (${sitemapResponse.status} ${sitemapResponse.statusText})`
    );
  }

  const sitemapXml = await sitemapResponse.text();
  const urlList = sanitizeIndexNowUrls(
    extractUrlsFromSitemap(sitemapXml),
    siteUrl
  );

  if (urlList.length === 0) {
    throw new Error("No same-host URLs were found in the sitemap.");
  }

  console.log(`Submitting ${urlList.length} URLs to IndexNow`);

  for (let index = 0; index < urlList.length; index += 10_000) {
    const batch = urlList.slice(index, index + 10_000);
    const result = await submitIndexNowUrls(batch, { baseUrl: siteUrl });
    console.log(
      `Submitted batch ${index / 10_000 + 1}: ${result.submitted} URLs`
    );
  }

  console.log("IndexNow submission complete.");
}

main().catch((error) => {
  console.error("IndexNow submission failed:", error);
  process.exitCode = 1;
});
