const INTERNAL_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^admin$/i,
  /\.local$/i,
];

function isLikelyInternalHost(host: string): boolean {
  return INTERNAL_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

function normalizeUrl(raw: string | undefined): URL | null {
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function requestOriginFromHeaders(req: Request): string | null {
  try {
    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = forwardedHost || req.headers.get("host");
    if (!host) return null;
    const proto = req.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}

export function resolvePublicSiteUrl(req?: Request): string {
  const envUrl = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (envUrl && !isLikelyInternalHost(envUrl.hostname)) {
    return envUrl.origin;
  }

  if (req) {
    const headerOrigin = requestOriginFromHeaders(req);
    const normalizedHeaderOrigin = normalizeUrl(headerOrigin || undefined);
    if (normalizedHeaderOrigin) {
      return normalizedHeaderOrigin.origin;
    }

    const requestUrl = normalizeUrl(req.url);
    if (requestUrl) {
      return requestUrl.origin;
    }
  }

  return "https://www.animestockmarket.tech";
}
