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

function resolveInvocation(arg1, arg2, arg3) {
  // New Appwrite runtimes pass a single object: { req, res, log, error }.
  if (
    arg1 &&
    typeof arg1 === "object" &&
    ("req" in arg1 || "res" in arg1 || "log" in arg1 || "error" in arg1)
  ) {
    return {
      req: arg1.req,
      res: arg1.res,
      log: typeof arg1.log === "function" ? arg1.log.bind(arg1) : null,
      error: typeof arg1.error === "function" ? arg1.error.bind(arg1) : null,
    };
  }

  // Legacy shape: (req, res, context)
  return {
    req: arg1,
    res: arg2,
    log:
      arg3 && typeof arg3.log === "function" ? arg3.log.bind(arg3) : null,
    error:
      arg3 && typeof arg3.error === "function"
        ? arg3.error.bind(arg3)
        : null,
  };
}

module.exports = async (arg1, arg2, arg3) => {
  const { req, log: runtimeLog, error: runtimeError } = resolveInvocation(
    arg1,
    arg2,
    arg3
  );
  const log = runtimeLog || console.log;
  const logError = runtimeError || console.error;

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
