import type { Stock, User } from "./types";
import { resolvePublicSiteUrl } from "./site-url";
import { generateAnimeSlug, generateCharacterSlug } from "./utils";

export const INDEXNOW_KEY = "0a22243be3be4f38b8268e312f1be720";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";

const LOCAL_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /\.local$/i,
];

type IndexNowResult = {
  ok: boolean;
  submitted: number;
  skipped: number;
  reason?: string;
};

function isPublicHost(hostname: string): boolean {
  return !LOCAL_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function toOrigin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

export function resolveIndexNowBaseUrl(req?: Request): string | null {
  const envOrigin = toOrigin(
    process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL
  );
  if (envOrigin && isPublicHost(new URL(envOrigin).hostname)) {
    return envOrigin;
  }

  if (typeof window !== "undefined") {
    const browserOrigin = toOrigin(window.location.origin);
    if (browserOrigin && isPublicHost(new URL(browserOrigin).hostname)) {
      return browserOrigin;
    }
  }

  if (req) {
    const requestOrigin = toOrigin(resolvePublicSiteUrl(req));
    if (requestOrigin && isPublicHost(new URL(requestOrigin).hostname)) {
      return requestOrigin;
    }
  }

  return null;
}

export function getIndexNowKeyLocation(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${INDEXNOW_KEY}.txt`;
}

export function sanitizeIndexNowUrls(
  urls: string[],
  baseUrl: string
): string[] {
  let host: string;
  try {
    host = new URL(baseUrl).host;
  } catch {
    return [];
  }

  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const candidate of urls) {
    if (typeof candidate !== "string") continue;

    try {
      const parsed = new URL(candidate);
      if (parsed.host !== host) continue;
      parsed.hash = "";
      const normalized = parsed.toString();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      sanitized.push(normalized);
    } catch {
      continue;
    }
  }

  return sanitized.slice(0, 10_000);
}

export function buildStockIndexNowUrls(
  stock: Pick<Stock, "characterName" | "characterSlug" | "anime">,
  baseUrl?: string | null
): string[] {
  const origin = baseUrl || resolveIndexNowBaseUrl();
  if (!origin) return [];

  const urls = [`${origin}/market`, `${origin}/anime`];
  if (stock.anime?.trim()) {
    urls.push(`${origin}/anime/${generateAnimeSlug(stock.anime)}`);
  }

  const characterSlug =
    stock.characterSlug?.trim() || generateCharacterSlug(stock.characterName);
  if (characterSlug) {
    urls.push(`${origin}/character/${encodeURIComponent(characterSlug)}`);
  }

  return sanitizeIndexNowUrls(urls, origin);
}

export function buildUserIndexNowUrls(
  user: Pick<User, "displaySlug" | "username">,
  baseUrl?: string | null
): string[] {
  const origin = baseUrl || resolveIndexNowBaseUrl();
  if (!origin) return [];

  const slug = (user.displaySlug || user.username || "").trim();
  if (!slug) return [];

  return sanitizeIndexNowUrls(
    [`${origin}/users/${encodeURIComponent(slug)}`],
    origin
  );
}

export async function submitIndexNowUrls(
  urls: string[],
  options: { baseUrl?: string | null } = {}
): Promise<IndexNowResult> {
  const baseUrl = options.baseUrl || resolveIndexNowBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      submitted: 0,
      skipped: urls.length,
      reason: "missing_public_base_url",
    };
  }

  const urlList = sanitizeIndexNowUrls(urls, baseUrl);
  if (urlList.length === 0) {
    return {
      ok: true,
      submitted: 0,
      skipped: urls.length,
    };
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      host: new URL(baseUrl).host,
      key: INDEXNOW_KEY,
      keyLocation: getIndexNowKeyLocation(baseUrl),
      urlList,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `IndexNow request failed (${response.status}): ${
        details || response.statusText
      }`
    );
  }

  return {
    ok: true,
    submitted: urlList.length,
    skipped: Math.max(0, urls.length - urlList.length),
  };
}

export async function publishIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (typeof window === "undefined") {
    return submitIndexNowUrls(urls);
  }

  const baseUrl = resolveIndexNowBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      submitted: 0,
      skipped: urls.length,
      reason: "missing_public_base_url",
    };
  }

  const response = await fetch("/api/indexnow", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      urlList: sanitizeIndexNowUrls(urls, baseUrl),
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `IndexNow proxy request failed (${response.status}): ${
        details || response.statusText
      }`
    );
  }

  return response.json();
}
