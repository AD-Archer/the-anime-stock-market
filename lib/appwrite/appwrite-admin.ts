import { Client, Databases, ID, Query } from "node-appwrite";

const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
};

function createBaseClient(): Client {
  const endpoint = requiredEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
  const projectId = requiredEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  return new Client().setEndpoint(endpoint).setProject(projectId);
}

export function getAdminDatabases(): Databases {
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing APPWRITE_API_KEY (required for server-side Appwrite access)"
    );
  }

  const client = createBaseClient().setKey(apiKey);
  return new Databases(client);
}

export { ID, Query };
