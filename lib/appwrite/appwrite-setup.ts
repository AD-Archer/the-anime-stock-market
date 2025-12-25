import "../load-env";

import { Permission, Role } from "node-appwrite";
import { getAdminDatabases } from "./appwrite-admin";

const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
};

// Prefer non-public variable name, fallback to NEXT_PUBLIC_* for backwards compatibility
const DATABASE_ID =
  process.env.APPWRITE_DATABASE_ID ||
  requiredEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID");

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
      { kind: "string", key: "displayName", size: 256, required: false },
      { kind: "string", key: "displaySlug", size: 256, required: false },
      { kind: "boolean", key: "hasPassword", required: false, default: false },
      { kind: "float", key: "balance", required: true, default: 0 },
      { kind: "boolean", key: "isAdmin", required: false, default: false },
      { kind: "string", key: "createdAt", size: 64, required: true },
      { kind: "string", key: "avatarUrl", size: 1024, required: false },
      { kind: "string", key: "bannedUntil", size: 64, required: false },
      { kind: "boolean", key: "showNsfw", required: false, default: false },
      { kind: "boolean", key: "showSpoilers", required: false, default: false },
      // Optional user theme preference: 'light' | 'dark' | 'system'
      { kind: "string", key: "theme", size: 16, required: false },
      {
        kind: "boolean",
        key: "isPortfolioPublic",
        required: false,
        default: false,
      },
      {
        kind: "boolean",
        key: "hideTransactions",
        required: false,
        default: false,
      },
      {
        kind: "boolean",
        key: "anonymousTransactions",
        required: false,
        default: false,
      },
      { kind: "string", key: "pendingDeletionAt", size: 64, required: false },
      {
        kind: "string",
        key: "lastDailyRewardClaim",
        size: 64,
        required: false,
      },
    ],
  },
  {
    id: "stocks",
    name: "Stocks",
    attributes: [
      { kind: "string", key: "characterName", size: 128, required: true },
      { kind: "string", key: "characterSlug", size: 256, required: true },
      { kind: "integer", key: "anilistCharacterId", required: true },
      {
        kind: "string",
        key: "anilistMediaIds",
        size: 500,
        required: false,
        array: true,
      },
      { kind: "string", key: "anime", size: 128, required: true },
      { kind: "integer", key: "anilistRank", required: false },
      { kind: "float", key: "currentPrice", required: true, default: 0 },
      { kind: "string", key: "createdBy", size: 64, required: true },
      { kind: "string", key: "createdAt", size: 64, required: true },
      { kind: "string", key: "imageUrl", size: 1024, required: true },
      { kind: "string", key: "animeImageUrl", size: 1024, required: false },
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
      { kind: "string", key: "animeId", size: 64, required: false },
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
      { kind: "string", key: "editedAt", size: 64, required: false },
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
      { kind: "string", key: "contentType", size: 16, required: false },
      { kind: "string", key: "commentId", size: 64, required: false },
      { kind: "string", key: "messageId", size: 64, required: false },
      { kind: "string", key: "reason", size: 32, required: true },
      { kind: "string", key: "description", size: 1000, required: false },
      { kind: "string", key: "status", size: 16, required: true },
      { kind: "string", key: "createdAt", size: 64, required: true },
      { kind: "string", key: "resolvedAt", size: 64, required: false },
      { kind: "string", key: "resolvedBy", size: 64, required: false },
      { kind: "string", key: "resolution", size: 16, required: false },
      { kind: "string", key: "metadata", size: 20000, required: false },
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
      { kind: "string", key: "replyToMessageId", size: 64, required: false },
      { kind: "string", key: "editedAt", size: 64, required: false },
    ],
  },
  {
    id: "appeals",
    name: "Appeals",
    attributes: [
      { kind: "string", key: "userId", size: 64, required: true },
      { kind: "string", key: "message", size: 5000, required: true },
      { kind: "string", key: "status", size: 16, required: true },
      { kind: "string", key: "createdAt", size: 64, required: true },
      { kind: "string", key: "resolvedAt", size: 64, required: false },
      { kind: "string", key: "resolvedBy", size: 64, required: false },
      { kind: "string", key: "resolutionNotes", size: 2000, required: false },
    ],
  },
  {
    id: "support_tickets",
    name: "Support Tickets",
    attributes: [
      { kind: "string", key: "userId", size: 64, required: false },
      { kind: "string", key: "contactEmail", size: 320, required: false },
      { kind: "string", key: "subject", size: 256, required: true },
      { kind: "string", key: "message", size: 10000, required: true },
      { kind: "string", key: "messages", size: 20000, required: false },
      {
        kind: "string",
        key: "status",
        size: 16,
        required: true,
        default: "open",
      },
      { kind: "string", key: "tag", size: 16, required: false },
      { kind: "string", key: "referenceId", size: 64, required: false },
      { kind: "string", key: "assignedTo", size: 64, required: false },
      { kind: "string", key: "createdAt", size: 64, required: true },
      { kind: "string", key: "updatedAt", size: 64, required: true },
    ],
  },
  {
    id: "admin_action_logs",
    name: "Admin Action Logs",
    attributes: [
      { kind: "string", key: "action", size: 64, required: true },
      { kind: "string", key: "performedBy", size: 64, required: true },
      { kind: "string", key: "targetUserId", size: 64, required: true },
      { kind: "string", key: "metadata", size: 20000, required: false },
      { kind: "string", key: "createdAt", size: 64, required: true },
    ],
  },
  {
    id: "awards",
    name: "Awards",
    attributes: [
      { kind: "string", key: "userId", size: 64, required: true },
      { kind: "string", key: "type", size: 32, required: true },
      { kind: "string", key: "unlockedAt", size: 64, required: true },
      { kind: "boolean", key: "redeemed", required: false, default: false },
    ],
  },
  {
    id: "friends",
    name: "Friends",
    attributes: [
      { kind: "string", key: "requesterId", size: 64, required: true },
      { kind: "string", key: "receiverId", size: 64, required: true },
      { kind: "string", key: "status", size: 16, required: true },
      { kind: "string", key: "createdAt", size: 64, required: true },
      { kind: "string", key: "respondedAt", size: 64, required: false },
    ],
  },
  {
    id: "daily_rewards",
    name: "Daily Rewards",
    attributes: [
      { kind: "string", key: "userId", size: 64, required: true },
      { kind: "string", key: "lastClaimDate", size: 64, required: true },
      { kind: "integer", key: "currentStreak", required: true, default: 0 },
      { kind: "integer", key: "longestStreak", required: true, default: 0 },
      { kind: "integer", key: "totalClaimed", required: true, default: 0 },
      { kind: "float", key: "totalAmount", required: true, default: 0 },
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

async function ensureIndex(
  databases: ReturnType<typeof getAdminDatabases>,
  collectionId: string,
  key: string,
  type: "key" | "fulltext" | "unique",
  attributes: string[]
) {
  try {
    // There is no get index, if this fails we can create
    const existing = await databases.listIndexes(DATABASE_ID, collectionId);
    if (existing.indexes.some((i: any) => i.key === key)) {
      return;
    }
  } catch (e) {
    // if list fails, we can assume we can create
  }
  console.log(`  Creating index: ${collectionId}.${key}`);
  await databases.createIndex(
    DATABASE_ID,
    collectionId,
    key,
    type as any,
    attributes,
    []
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
    // Add indexes after attributes are created
    if (collection.id === "stocks") {
      await ensureIndex(databases, collection.id, "characterSlug", "key", [
        "characterSlug",
      ]);
      await ensureIndex(databases, collection.id, "anilistCharacterId", "key", [
        "anilistCharacterId",
      ]);
    }
    if (collection.id === "support_tickets") {
      await ensureIndex(databases, collection.id, "status", "key", ["status"]);
      await ensureIndex(databases, collection.id, "userId", "key", ["userId"]);
      await ensureIndex(databases, collection.id, "contactEmail", "key", [
        "contactEmail",
      ]);
      await ensureIndex(databases, collection.id, "subject", "fulltext", [
        "subject",
      ]);
      await ensureIndex(databases, collection.id, "message", "fulltext", [
        "message",
      ]);
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
