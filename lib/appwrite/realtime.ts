import { Realtime } from "appwrite";
import { client, ensureAppwriteInitialized } from "./appwrite";

type RealtimeChannels = string | string[];
export type RealtimeEvent<T = unknown> = {
  events: string[];
  channels: string[];
  timestamp: string | number;
  payload: T;
};

const realtime = new Realtime(client);

export function subscribeToRealtime<T = unknown>(
  channels: RealtimeChannels,
  callback: (event: RealtimeEvent<T>) => void,
  onError?: (error: unknown) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  let closed = false;
  let closeSubscription: (() => Promise<void>) | null = null;

  void (async () => {
    try {
      await ensureAppwriteInitialized();
      if (closed) return;

      const subscription = Array.isArray(channels)
        ? await realtime.subscribe<T>(channels, callback as any)
        : await realtime.subscribe<T>(channels, callback as any);
      closeSubscription = () => subscription.close();

      if (closed) {
        await subscription.close();
        closeSubscription = null;
      }
    } catch (error) {
      onError?.(error);
    }
  })();

  return () => {
    closed = true;
    if (!closeSubscription) return;
    const close = closeSubscription;
    closeSubscription = null;
    void close().catch(() => {});
  };
}
