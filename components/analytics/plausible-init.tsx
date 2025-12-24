"use client";

import { useEffect } from "react";

export default function PlausibleInit() {
  useEffect(() => {
    const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "adarcher.app";
    const apiHost =
      process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST ??
      "https://plausible.adarcher.app";

    let cancelled = false;

    async function initTracker() {
      if ((window as any).__PLAUSIBLE__ || (window as any).plausible) return;

      try {
        const mod = await import("@plausible-analytics/tracker");
        // Try common factory shapes
        const candidate = (mod &&
          ((mod as any).default ??
            (mod as any).create ??
            (mod as any).init ??
            mod)) as any;
        let tracker: any = null;

        if (typeof candidate === "function") {
          // factory function
          tracker = candidate({ domain, apiHost });
        } else if (candidate && typeof candidate.create === "function") {
          tracker = candidate.create({ domain, apiHost });
        }

        if (!tracker) {
          console.warn("Plausible: unexpected tracker module shape", mod);
          return;
        }

        if (typeof tracker.enableAutoPageviews === "function") {
          tracker.enableAutoPageviews();
        }
        if (typeof tracker.enableAutoOutboundTracking === "function") {
          tracker.enableAutoOutboundTracking();
        }

        (window as any).__PLAUSIBLE__ = tracker;
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
          s.src =
            apiHost.replace(/\/$/, "") + "/js/pa-Sm5QFqCwU_HuQYTQ5h65N.js";
          s.onload = () => {
            try {
              (window as any).plausible?.init?.();
            } catch {}
          };
          document.body.appendChild(s);
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
