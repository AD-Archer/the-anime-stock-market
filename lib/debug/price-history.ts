const DEBUG_PRICE_HISTORY =
  process.env.NEXT_PUBLIC_DEBUG_PRICE_HISTORY === "1";

type DebugPayload = Record<string, unknown>;

export const debugPriceHistory = (event: string, payload: DebugPayload) => {
  if (!DEBUG_PRICE_HISTORY || typeof window === "undefined") return;

  const body = JSON.stringify({ event, ...payload });

  try {
    if ("sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/debug/price-history", blob);
      return;
    }
  } catch {}

  fetch("/api/debug/price-history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
};
