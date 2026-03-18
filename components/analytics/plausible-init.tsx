"use client";

import { useEffect } from "react";
import { sendSystemEvent } from "@/lib/system-events-client";

const ERROR_REPORT_LIMIT = 6;
const ERROR_REPORT_WINDOW_MS = 5 * 60 * 1000;

function createErrorReporter() {
  let recentErrorTimes: number[] = [];

  return async (payload: {
    message: string;
    source?: string;
    stack?: string;
  }) => {
    const now = Date.now();
    recentErrorTimes = recentErrorTimes.filter(
      (timestamp) => now - timestamp < ERROR_REPORT_WINDOW_MS,
    );
    if (recentErrorTimes.length >= ERROR_REPORT_LIMIT) {
      return;
    }
    recentErrorTimes.push(now);

    try {
      const plausible = (window as any).plausible as
        | ((
            event: string,
            options?: { props?: Record<string, unknown> },
          ) => void)
        | undefined;
      if (typeof plausible === "function") {
        plausible("client_error", {
          props: {
            source: payload.source || "unknown",
            hasStack: Boolean(payload.stack),
          },
        });
      }
    } catch (error) {
      console.warn("Failed to track plausible client_error", error);
    }

    try {
      await sendSystemEvent({
        type: "client_error",
        metadata: {
          message: payload.message.slice(0, 1200),
          source: payload.source?.slice(0, 300),
          stack: payload.stack?.slice(0, 4000),
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
        },
      });
    } catch (error) {
      console.warn("Failed to report client error", error);
    }
  };
}

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
      "www.animestockmarket.tech";
    const apiHost =
      process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST ??
      "https://plausible.adarcher.app";
    const reportClientError = createErrorReporter();
    const shouldDebug = process.env.NODE_ENV === "development";

    async function initTracker() {
      if ((window as any).plausible) return;

      try {
        const { init } = await import("@plausible-analytics/tracker");

        init({
          domain,
          endpoint: `${apiHost}/api/event`,
          autoCapturePageviews: true,
          hashBasedRouting: true,
          captureOnLocalhost: process.env.NODE_ENV === "development",
        });
      } catch (err) {
        if (shouldDebug) {
          console.warn(
            "Plausible tracker import failed, falling back to CDN",
            err,
          );
        }
        // Fallback: inject CDN script
        if (!document.querySelector("script[data-plausible-fallback]")) {
          const s = document.createElement("script");
          s.setAttribute("async", "true");
          s.setAttribute("data-plausible-fallback", "true");
          s.setAttribute("data-domain", domain);
          s.setAttribute("data-api", apiHost);
          s.src = `${apiHost}/js/script.js`;
          s.onerror = () => {
            if (shouldDebug) {
              console.warn("Plausible fallback script was blocked or failed to load.");
            }
          };
          document.head.appendChild(s);
        }
      }
    }

    initTracker();

    const onWindowError = (event: ErrorEvent) => {
      void reportClientError({
        message: event.message || "Unhandled window error",
        source: event.filename
          ? `${event.filename}:${event.lineno}:${event.colno}`
          : "window.error",
        stack: event.error?.stack,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection";
      const stack = reason instanceof Error ? reason.stack : undefined;
      void reportClientError({
        message,
        source: "unhandledrejection",
        stack,
      });
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
