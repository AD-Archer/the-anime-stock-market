import { Client, Account, Databases } from "appwrite";

const client = new Client();

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (endpoint && projectId) {
  client.setEndpoint(endpoint).setProject(projectId);
} else {
  // Allow builds to succeed without Appwrite env configured.
  // Any Appwrite calls will still fail at runtime until env is set.
  console.warn(
    "Appwrite client not configured: missing NEXT_PUBLIC_APPWRITE_ENDPOINT/PROJECT_ID"
  );
}

export const account = new Account(client);
export const databases = new Databases(client);

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
