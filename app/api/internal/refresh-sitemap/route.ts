import { NextResponse } from "next/server";
import { generateRuntimeSitemap, renderSitemapXml } from "@/lib/runtime-sitemap";

export const dynamic = "force-dynamic";

function getExpectedSecret(): string | null {
  const secret = process.env.SITEMAP_REFRESH_SECRET?.trim();
  return secret ? secret : null;
}

function isAuthorized(req: Request): boolean {
  const expected = getExpectedSecret();
  if (!expected) return false;

  const headerSecret = req.headers.get("x-sitemap-refresh-secret")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;

  return headerSecret === expected || bearerSecret === expected;
}

export async function POST(req: Request) {
  if (!getExpectedSecret()) {
    return NextResponse.json(
      { error: "SITEMAP_REFRESH_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await generateRuntimeSitemap(req);
    const xml = renderSitemapXml(result.entries);

    return NextResponse.json({
      ok: true,
      stats: result.stats,
      sampleUrls: result.entries.slice(0, 10).map((entry) => entry.url),
      xmlBytes: Buffer.byteLength(xml, "utf8"),
    });
  } catch (error) {
    console.warn("Failed to refresh runtime sitemap:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh runtime sitemap.",
      },
      { status: 500 }
    );
  }
}

