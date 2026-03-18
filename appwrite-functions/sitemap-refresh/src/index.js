const fetch = require("node-fetch");

function getHeader(req, name) {
  if (!req || !req.headers) return undefined;
  const key = Object.keys(req.headers).find(
    (header) => header.toLowerCase() === name.toLowerCase()
  );
  return key ? req.headers[key] : undefined;
}

function normalizeBaseUrl(raw) {
  if (!raw) return null;
  try {
    return new URL(String(raw)).origin;
  } catch {
    return null;
  }
}

function resolveBaseUrl(req) {
  return (
    normalizeBaseUrl(process.env.SITEMAP_REFRESH_BASE_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeBaseUrl(getHeader(req, "x-forwarded-host")
      ? `${getHeader(req, "x-forwarded-proto") || "https"}://${getHeader(
          req,
          "x-forwarded-host"
        )}`
      : undefined)
  );
}

module.exports = async (req, res, context) => {
  const log = context?.log || console.log;
  const logError = context?.error || console.error;

  try {
    const baseUrl = resolveBaseUrl(req);
    const secret = process.env.SITEMAP_REFRESH_SECRET;

    if (!baseUrl) {
      logError("Missing SITEMAP_REFRESH_BASE_URL or NEXT_PUBLIC_SITE_URL");
      return {
        ok: false,
        error:
          "Missing sitemap refresh base URL. Set SITEMAP_REFRESH_BASE_URL or NEXT_PUBLIC_SITE_URL.",
      };
    }

    if (!secret) {
      logError("Missing SITEMAP_REFRESH_SECRET");
      return {
        ok: false,
        error: "Missing SITEMAP_REFRESH_SECRET.",
      };
    }

    const targetUrl = `${baseUrl}/api/internal/refresh-sitemap`;
    log(`Refreshing sitemap via ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sitemap-refresh-secret": secret,
      },
      body: JSON.stringify({
        source: "appwrite-function",
        triggeredAt: new Date().toISOString(),
      }),
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }

    if (!response.ok) {
      logError(`Sitemap refresh failed with status ${response.status}`, payload);
      return {
        ok: false,
        status: response.status,
        error:
          payload && typeof payload === "object" && payload.error
            ? payload.error
            : `Sitemap refresh failed with status ${response.status}.`,
      };
    }

    log("Sitemap refresh completed", payload);
    return {
      ok: true,
      status: response.status,
      targetUrl,
      result: payload,
    };
  } catch (error) {
    logError("Sitemap refresh function crashed", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
