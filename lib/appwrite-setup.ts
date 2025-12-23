import "./load-env";

import { Permission, Role } from "node-appwrite";
import { getAdminDatabases } from "./appwrite-admin";

const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
};

const DATABASE_ID = requiredEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID");

type AttributePlan =
  | {
      kind: "string";
      key: string;
      size: number;
      required: boolean;
      array?: boolean;
      default?: string;
    }
  | {
      kind: "integer";
      key: string;
      required: boolean;
      min?: number;
      max?: number;
      default?: number;
    }
  | {
      kind: "float";
      key: string;
      required: boolean;
      min?: number;
      max?: number;
      default?: number;
    }
  | {
      kind: "boolean";
      key: string;
      required: boolean;
      default?: boolean;
    };

type CollectionPlan = {
  id: string;
  name: string;
  attributes: AttributePlan[];
};

const collections: CollectionPlan[] = [
  {
    id: "users",
    name: "Users",
    attributes: [
      { kind: "string", key: "username", size: 128, required: true },
      { kind: "string", key: "email", size: 320, required: true },
      { kind: "float", key: "balance", required: true, default: 0 },
      { kind: "boolean", key: "isAdmin", required: true, default: false },
      { kind: "string", key: "createdAt", size: 64, required: true },
      { kind: "boolean", key: "isBanned", required: true, default: false },
      { kind: "boolean", key: "showNsfw", required: true, default: true },
      { kind: "boolean", key: "showSpoilers", required: true, default: true },
      {
        kind: "boolean",
        key: "isPortfolioPublic",
        required: true,
        default: false,
      },
    ],
  },
  {
    id: "stocks",
    name: "Stocks",
    attributes: [
      { kind: "string", key: "characterName", size: 128, required: true },
      { kind: "string", key: "anime", size: 128, required: true },
      { kind: "float", key: "currentPrice", required: true, default: 0 },
      { kind: "string", key: "createdBy", size: 64, required: true },
      { kind: "string", key: "createdAt", size: 64, required: true },
      { kind: "string", key: "imageUrl", size: 1024, required: true },
      { kind: "string", key: "description", size: 10000, required: true },
      { kind: "integer", key: "totalShares", required: true, default: 0 },
      { kind: "integer", key: "availableShares", required: true, default: 0 },
    ],
  },
  {
    id: "transactions",
    name: "Transactions",
    attributes: [
      { kind: "string", key: "userId", size: 64, required: true },
      { kind: "string", key: "stockId", size: 64, required: true },
      { kind: "string", key: "type", size: 8, required: true },
      { kind: "integer", key: "shares", required: true, default: 0 },
      { kind: "float", key: "pricePerShare", required: true, default: 0 },
      { kind: "float", key: "totalAmount", required: true, default: 0 },
      { kind: "string", key: "timestamp", size: 64, required: true },
    ],
  },
  {
    id: "portfolios",
    name: "Portfolios",
    attributes: [
      { kind: "string", key: "userId", size: 64, required: true },
      { kind: "string", key: "stockId", size: 64, required: true },
      { kind: "integer", key: "shares", required: true, default: 0 },
      { kind: "float", key: "averageBuyPrice", required: true, default: 0 },
    ],
  },
  {
    id: "price_history",
    name: "Price History",
    attributes: [
      { kind: "string", key: "stockId", size: 64, required: true },
      { kind: "float", key: "price", required: true, default: 0 },
      { kind: "string", key: "timestamp", size: 64, required: true },
    ],
  },
  {
    id: "comments",
    name: "Comments",
    attributes: [
      { kind: "string", key: "userId", size: 64, required: true },
      { kind: "string", key: "animeId", size: 64, required: true },
      { kind: "string", key: "characterId", size: 64, required: false },
      { kind: "string", key: "content", size: 10000, required: true },
      { kind: "string", key: "timestamp", size: 64, required: true },
      { kind: "string", key: "parentId", size: 64, required: false },
      { kind: "string", key: "tags", size: 16, required: false, array: true },
      {
        kind: "string",
        key: "likedBy",
        size: 64,
        required: false,
        array: true,
      },
      {
        kind: "string",
        key: "dislikedBy",
        size: 64,
        required: false,
        array: true,
      },
    ],
  },
  {
    id: "buyback_offers",
    name: "Buyback Offers",
    attributes: [
      { kind: "string", key: "stockId", size: 64, required: true },
      { kind: "float", key: "offeredPrice", required: true, default: 0 },
      { kind: "string", key: "offeredBy", size: 64, required: true },
      {
        kind: "string",
        key: "targetUsers",
        size: 64,
        required: false,
        array: true,
      },
      { kind: "string", key: "expiresAt", size: 64, required: true },
      { kind: "string", key: "status", size: 16, required: true },
      { kind: "string", key: "acceptedBy", size: 64, required: false },
      { kind: "integer", key: "acceptedShares", required: false },
    ],
  },
  {
    id: "notifications",
    name: "Notifications",
    attributes: [
      { kind: "string", key: "userId", size: 64, required: true },
      { kind: "string", key: "type", size: 32, required: true },
      { kind: "string", key: "title", size: 256, required: true },
      { kind: "string", key: "message", size: 10000, required: true },
      { kind: "string", key: "data", size: 20000, required: false },
      { kind: "boolean", key: "read", required: true, default: false },
      { kind: "string", key: "createdAt", size: 64, required: true },
    ],
  },
  {
    id: "reports",
    name: "Reports",
    attributes: [
      { kind: "string", key: "reporterId", size: 64, required: true },
      { kind: "string", key: "reportedUserId", size: 64, required: true },
      { kind: "string", key: "commentId", size: 64, required: true },
      { kind: "string", key: "commentContent", size: 10000, required: false },
      { kind: "string", key: "reason", size: 32, required: true },
      { kind: "string", key: "description", size: 1000, required: false },
      { kind: "string", key: "status", size: 16, required: true },
      { kind: "string", key: "createdAt", size: 64, required: true },
      { kind: "string", key: "resolvedAt", size: 64, required: false },
      { kind: "string", key: "resolvedBy", size: 64, required: false },
      { kind: "string", key: "resolution", size: 16, required: false },
      { kind: "string", key: "threadContext", size: 20000, required: false },
      { kind: "string", key: "commentLocation", size: 512, required: false },
    ],
  },
  {
    id: "messages",
    name: "Messages",
    attributes: [
      { kind: "string", key: "conversationId", size: 128, required: true },
      { kind: "string", key: "senderId", size: 64, required: true },
      { kind: "string", key: "content", size: 10000, required: true },
      { kind: "string", key: "createdAt", size: 64, required: true },
      { kind: "string", key: "readBy", size: 64, required: false, array: true },
    ],
  },
];

async function ensureDatabase(databases: ReturnType<typeof getAdminDatabases>) {
  try {
    await databases.get(DATABASE_ID);
    console.log(`Database exists: ${DATABASE_ID}`);
  } catch {
    console.log(`Creating database: ${DATABASE_ID}`);
    await databases.create(DATABASE_ID, "Anime Stock Market");
  }
}

async function ensureCollection(
  databases: ReturnType<typeof getAdminDatabases>,
  plan: CollectionPlan
) {
  try {
    await databases.getCollection(DATABASE_ID, plan.id);
    console.log(`Collection exists: ${plan.id}`);
  } catch {
    console.log(`Creating collection: ${plan.id}`);

    // Dev-friendly permissions. Tighten for production.
    const permissions = [
      Permission.read(Role.any()),
      Permission.create(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any()),
    ];

    await databases.createCollection(
      DATABASE_ID,
      plan.id,
      plan.name,
      permissions,
      false
    );
  }
}

async function ensureAttribute(
  databases: ReturnType<typeof getAdminDatabases>,
  collectionId: string,
  attr: AttributePlan
) {
  try {
    const existing = await databases.listAttributes(DATABASE_ID, collectionId);
    if (existing.attributes.some((a: any) => a.key === attr.key)) {
      return;
    }
  } catch {
    // If listAttributes isn't available in older SDKs, fall through and try create.
  }

  console.log(`  Creating attribute: ${collectionId}.${attr.key}`);

  // Appwrite (TablesDB) doesn't allow setting a default value on a *required* attribute.
  // We still keep the attribute required and rely on the app/seed to provide values.
  const defaultIfAllowed = !attr.required ? (attr as any).default : undefined;

  if (attr.kind === "string") {
    await databases.createStringAttribute(
      DATABASE_ID,
      collectionId,
      attr.key,
      attr.size,
      attr.required,
      defaultIfAllowed,
      attr.array ?? false
    );
    return;
  }

  if (attr.kind === "integer") {
    await databases.createIntegerAttribute(
      DATABASE_ID,
      collectionId,
      attr.key,
      attr.required,
      attr.min,
      attr.max,
      defaultIfAllowed
    );
    return;
  }

  if (attr.kind === "float") {
    await databases.createFloatAttribute(
      DATABASE_ID,
      collectionId,
      attr.key,
      attr.required,
      attr.min,
      attr.max,
      defaultIfAllowed
    );
    return;
  }

  await databases.createBooleanAttribute(
    DATABASE_ID,
    collectionId,
    attr.key,
    attr.required,
    defaultIfAllowed
  );
}

async function setup() {
  console.log("Bootstrapping Appwrite database/tables...");
  console.log(
    `Using DATABASE_ID=${DATABASE_ID}. (In the Console these will show as “Tables”/“Collections”.)`
  );

  const databases = getAdminDatabases();

  await ensureDatabase(databases);

  for (const collection of collections) {
    await ensureCollection(databases, collection);
    for (const attr of collection.attributes) {
      try {
        await ensureAttribute(databases, collection.id, attr);
      } catch (error) {
        console.warn(
          `  Failed to create attribute ${collection.id}.${attr.key}:`,
          error
        );
      }
    }
  }

  console.log(
    "Done. If this is your first run, give Appwrite a moment to index attributes before seeding."
  );
}

setup().catch((err) => {
  console.error(err);
  process.exit(1);
});
