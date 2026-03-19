import { Client, Databases, ID, Messaging, Query } from "node-appwrite";

const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
};

function createBaseClient(): Client {
  // Prefer non-public variable names to avoid leaking secrets
  // Fallback to NEXT_PUBLIC_* for backwards compatibility
  const endpoint =
    process.env.APPWRITE_ENDPOINT || requiredEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
  const projectId =
    process.env.APPWRITE_PROJECT_ID || requiredEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  return new Client().setEndpoint(endpoint).setProject(projectId);
}

export function getAdminDatabases(): Databases {
  const client = getAdminClient();
  return new Databases(client);
}

export function getAdminMessaging(): Messaging {
  const client = getAdminClient();
  return new Messaging(client);
}

function getAdminClient(): Client {
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing APPWRITE_API_KEY (required for server-side Appwrite access)"
    );
  }

  return createBaseClient().setKey(apiKey);
}

export { ID, Query };
