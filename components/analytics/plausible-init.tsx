"use client";

import { useEffect } from "react";

export default function PlausibleInit() {
  useEffect(() => {
    // Derive plausible domain from explicit env var, or fall back to site URL host
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const derivedHost = siteUrl
      ? (() => {
          try {
            return new URL(siteUrl).host;
          } catch {
            return undefined;
          }
        })()
      : undefined;

    const domain =
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ??
      derivedHost ??
      "animestockexchange.adarcher.app";
    const apiHost =
      process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST ??
      "https://plausible.adarcher.app";

    let cancelled = false;

    async function initTracker() {
      if ((window as any).plausible) return;

      try {
        const { init } = await import("@plausible-analytics/tracker");
        
        init({
          domain,
          endpoint: `${apiHost}/api/event`,
          autoCapturePageviews: true,
          hashBasedRouting: true,
          captureOnLocalhost: process.env.NODE_ENV === 'development',
        });

        console.log('Plausible tracker initialized for domain:', domain);
      } catch (err) {
        console.warn(
          "Plausible tracker import failed, falling back to CDN",
          err
        );
        // Fallback: inject CDN script
        if (!document.querySelector("script[data-plausible-fallback]")) {
          const s = document.createElement("script");
          s.setAttribute("async", "true");
          s.setAttribute("data-plausible-fallback", "true");
          s.setAttribute("data-domain", domain);
          s.setAttribute("data-api", apiHost);
          s.src = `${apiHost}/js/script.js`;
          document.head.appendChild(s);
        }
      }
    }

    initTracker();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
