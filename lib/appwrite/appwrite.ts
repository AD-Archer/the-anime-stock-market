import { Client, Account, Databases } from "appwrite";

const client = new Client();

// Configuration - prefer server-side only variables, fallback to NEXT_PUBLIC_ for backwards compatibility
const endpoint =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

// Initialize client if we have config (server-side or build-time)
if (endpoint && projectId) {
  client.setEndpoint(endpoint).setProject(projectId);
} else if (typeof window !== "undefined") {
  // Client-side: fetch config from API route at runtime synchronously
  // This prevents secrets from being baked into the client bundle
  // We need to ensure the client is initialized before use, so we'll do this eagerly
  let configPromise: Promise<void> | null = null;

  const initializeClient = async () => {
    if (configPromise) return configPromise;

    configPromise = (async () => {
      try {
        const res = await fetch("/api/appwrite-config");
        if (!res.ok) {
          throw new Error(`Failed to fetch config: ${res.status}`);
        }
        const config = await res.json();
        // Sanitize values returned from the API (strip surrounding quotes and whitespace)
        const strip = (v: unknown): string | undefined => {
          if (v === undefined || v === null) return undefined;
          const raw =
            typeof v === "string" || typeof v === "number"
              ? String(v)
              : undefined;
          if (!raw) return undefined;
          const sanitized = raw.trim().replace(/^['"]+|['"]+$/g, "");
          return sanitized === "" ? undefined : sanitized;
        };
        config.endpoint = strip(config.endpoint);
        config.projectId = strip(config.projectId);
        config.databaseId = strip(config.databaseId);

        // Expose the runtime config object for other libraries (only on client)
        (window as any).__APPWRITE_CONFIG = {
          endpoint: config.endpoint,
          projectId: config.projectId,
          databaseId: config.databaseId,
        };

        if (config.endpoint && config.projectId) {
          try {
            client.setEndpoint(config.endpoint).setProject(config.projectId);
          } catch (err) {
            console.warn("Failed to set Appwrite endpoint/projectId:", err);
          }
        } else {
          console.warn(
            "Appwrite client not configured: failed to load config from API"
          );
        }
      } catch (error) {
        console.warn("Failed to load Appwrite config:", error);
      }
    })();

    return configPromise;
  };

  // Start initialization immediately
  initializeClient();

  // Export a function to ensure client is initialized before use
  (window as any).__ensureAppwriteInitialized = initializeClient;
} else {
  // Server-side but no config - allow builds to succeed
  console.warn(
    "Appwrite client not configured: missing APPWRITE_ENDPOINT/PROJECT_ID"
  );
}

export const account = new Account(client);
export const databases = new Databases(client);

// Helper function to ensure client is initialized before making any Appwrite calls
export async function ensureAppwriteInitialized(): Promise<void> {
  if (typeof window === "undefined") return;

  // If we already have endpoint and projectId from env vars, we're good
  if (endpoint && projectId) return;

  // Otherwise, wait for the async initialization
  const ensureFn = (window as any).__ensureAppwriteInitialized;
  if (ensureFn) {
    await ensureFn();
  } else {
    // If initialization function doesn't exist, try to initialize now
    try {
      const res = await fetch("/api/appwrite-config");
      if (res.ok) {
        const config = await res.json();
        // store runtime config for other modules
        (window as any).__APPWRITE_CONFIG = {
          endpoint: config.endpoint,
          projectId: config.projectId,
          databaseId: config.databaseId,
        };
        if (config.endpoint && config.projectId) {
          client.setEndpoint(config.endpoint).setProject(config.projectId);
        }
      }
    } catch (error) {
      console.warn("Failed to initialize Appwrite client:", error);
    }
  }
}

export async function refreshAppwriteJwt(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const jwtResponse = await account.createJWT();
    client.setJWT(jwtResponse.jwt);
    return jwtResponse.jwt;
  } catch (error) {
    console.warn("Failed to refresh Appwrite JWT", error);
    client.setJWT("");
    return null;
  }
}

export function clearAppwriteJwt(): void {
  client.setJWT("");
}

export { client };
