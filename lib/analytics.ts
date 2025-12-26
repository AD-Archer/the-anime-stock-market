/**
 * Lightweight Plausible helper that no-ops on the server or when the tracker
 * has not been initialized yet.
 */
export function trackPlausible(
  event: string,
  props?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  const plausible = (window as any).plausible as
    | ((event: string, options?: { props?: Record<string, unknown> }) => void)
    | undefined;
  if (typeof plausible !== "function") return;

  try {
    plausible(event, props ? { props } : undefined);
  } catch (error) {
    console.warn("Failed to send Plausible event", error);
  }
}
