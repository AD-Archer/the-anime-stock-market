import { NextResponse } from "next/server";

const extractMeta = (
  html: string,
  key: string,
  attr: "property" | "name" = "property"
): string | undefined => {
  const pattern = new RegExp(
    `<meta[^>]+${attr}=[\"']${key}[\"'][^>]+content=[\"']([^\"']+)[\"'][^>]*>`,
    "i"
  );
  const match = html.match(pattern);
  return match?.[1]?.trim();
};

const extractTitle = (html: string): string | undefined => {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim();
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(target.toString(), {
      signal: controller.signal,
      headers: {
        "user-agent": "AnimeStockMarketBot/1.0",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
    }

    const text = (await response.text()).slice(0, 200000);
    const title =
      extractMeta(text, "og:title") ||
      extractMeta(text, "twitter:title", "name") ||
      extractTitle(text);
    const description =
      extractMeta(text, "og:description") ||
      extractMeta(text, "description", "name") ||
      extractMeta(text, "twitter:description", "name");
    const image =
      extractMeta(text, "og:image") ||
      extractMeta(text, "twitter:image", "name");
    const siteName = extractMeta(text, "og:site_name");

    return NextResponse.json({
      url: target.toString(),
      title,
      description,
      image,
      siteName,
    });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 502 });
  }
}
