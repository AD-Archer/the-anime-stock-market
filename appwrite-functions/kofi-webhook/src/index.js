const { Client, Databases, ID, Query } = require("node-appwrite");
const fetch = require("node-fetch");

const DEFAULT_PREMIUM_META = {
  isPremium: false,
  premiumSince: null,
  charactersAddedToday: 0,
  charactersAddedTodayAnime: 0,
  charactersAddedTodayManga: 0,
  charactersDuplicateToday: 0,
  quotaResetAt: null,
  autoAdd: true,
  comboMode: "standard",
  tierLevel: undefined,
  donationAmount: undefined,
  donationDate: null,
  donationHistory: [],
  lastPremiumRewardClaim: null,
};

const PREMIUM_TIERS = [
  { level: 1, label: "Tier 1", donationRequirement: 5 },
  { level: 2, label: "Tier 2", donationRequirement: 10 },
  { level: 3, label: "Tier 3", donationRequirement: 20 },
  { level: 4, label: "Tier 4", donationRequirement: 30 },
];

const getPremiumTierByDonation = (amount) => {
  if (!amount) return undefined;
  return [...PREMIUM_TIERS].reverse().find((tier) => amount >= tier.donationRequirement);
};

const toNumber = (value) => {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeDonationHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const amount = toNumber(entry.amount);
      const date = toDate(entry.date || entry.donationDate);
      if (amount === undefined || !date) return null;
      return { amount, date };
    })
    .filter(Boolean);
};

const parsePremiumMeta = (value) => {
  if (!value) return { ...DEFAULT_PREMIUM_META };
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = null;
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return { ...DEFAULT_PREMIUM_META };
  }
  return {
    ...DEFAULT_PREMIUM_META,
    ...parsed,
    isPremium: toBoolean(parsed.isPremium, DEFAULT_PREMIUM_META.isPremium),
    premiumSince: parsed.premiumSince ?? DEFAULT_PREMIUM_META.premiumSince,
    donationHistory: normalizeDonationHistory(parsed.donationHistory),
    donationAmount: toNumber(parsed.donationAmount),
    donationDate: parsed.donationDate ?? DEFAULT_PREMIUM_META.donationDate,
    tierLevel: parsed.tierLevel,
  };
};

const getDonationMonthKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const getMonthlyDonationTotal = (history, referenceDate) => {
  if (!referenceDate) return 0;
  const key = getDonationMonthKey(referenceDate);
  return history.reduce(
    (total, entry) =>
      getDonationMonthKey(entry.date) === key ? total + entry.amount : total,
    0
  );
};

const serializeDonationHistory = (history) =>
  history.map((entry) => ({
    amount: entry.amount,
    date: entry.date instanceof Date ? entry.date.toISOString() : entry.date,
  }));

const encodeMetadata = (metadata) => {
  if (!metadata || Object.keys(metadata).length === 0) return undefined;
  try {
    return JSON.stringify(metadata);
  } catch {
    return undefined;
  }
};

const parsePayload = (req) => {
  if (!req?.body) return {};
  if (typeof req.body === "object") return req.body;
  const raw = String(req.body);
  try {
    return JSON.parse(raw);
  } catch {
    const params = new URLSearchParams(raw);
    const embedded = params.get("data") || params.get("payload");
    if (!embedded) return {};
    try {
      return JSON.parse(embedded);
    } catch {
      return {};
    }
  }
};

const getHeader = (req, name) => {
  if (!req?.headers) return undefined;
  const headerKey = Object.keys(req.headers).find(
    (key) => key.toLowerCase() === name.toLowerCase()
  );
  return headerKey ? req.headers[headerKey] : undefined;
};

const postSystemEvent = async (payload, log, logError) => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const response = await fetch(`${siteUrl}/api/system-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      logError("Failed to send system event:", response.status);
    } else {
      log("System event sent");
    }
  } catch (error) {
    logError("System event error:", error);
  }
};

module.exports = async (req, res, context) => {
  const log = context?.log || console.log;
  const logError = context?.error || console.error;

  try {
    log("Ko-fi webhook received");

    const endpoint = process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    const databaseId = process.env.APPWRITE_DATABASE_ID;

    if (!endpoint || !projectId || !apiKey || !databaseId) {
      logError("Missing Appwrite env vars", {
        hasEndpoint: Boolean(endpoint),
        hasProjectId: Boolean(projectId),
        hasApiKey: Boolean(apiKey),
        hasDatabaseId: Boolean(databaseId),
      });
      return { error: "Missing Appwrite configuration" };
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    const payload = parsePayload(req);
    const headerToken = getHeader(req, "x-kofi-verification-token");
    const verificationToken =
      payload.verification_token || payload.verificationToken || headerToken;

    if (verificationToken !== process.env.KOFI_VERIFICATION_TOKEN) {
      logError("Invalid verification token received");
      return { error: "Invalid verification token" };
    }

    const email = payload.email || payload?.buyer_email;
    const message = payload.message || payload?.messageText;
    const fromName = payload.from_name || payload?.fromName;
    const amount = toNumber(payload.amount || payload?.amount_total);
    const donationDate =
      toDate(payload.timestamp || payload.created_at) || new Date();
    const kofiType = payload.type || payload?.transaction_type;
    const isSubscription = toBoolean(payload.is_subscription_payment, false);

    log(`Processing Ko-fi payment: $${amount ?? 0} from ${email || fromName || "unknown"}`);

    if (!amount || amount <= 0) {
      logError("Invalid donation amount");
      return { error: "Invalid donation amount" };
    }

    const messageText = typeof message === "string" ? message : "";
    const usernameMatch =
      messageText.match(/username[:=]\s*([a-z0-9_-]+)/i) ||
      messageText.match(/user[:=]\s*([a-z0-9_-]+)/i) ||
      messageText.match(/@([a-z0-9_-]+)/i);
    const username = usernameMatch ? usernameMatch[1] : payload.username || null;

    if (!username && !email) {
      logError("No user identifier found in donation");
      return { error: "No user identifier found" };
    }

    let userDoc = null;
    if (email) {
      const response = await databases.listDocuments(
        databaseId,
        "users",
        [Query.equal("email", email), Query.limit(1)]
      );
      if (response.documents.length > 0) {
        userDoc = response.documents[0];
      }
    }

    if (!userDoc && username) {
      const response = await databases.listDocuments(
        databaseId,
        "users",
        [Query.equal("username", username), Query.limit(1)]
      );
      if (response.documents.length > 0) {
        userDoc = response.documents[0];
      }
    }

    if (!userDoc) {
      logError(`User not found: ${username || email}`);
      return { error: "User not found" };
    }

    const currentMeta = parsePremiumMeta(userDoc.premiumMeta);
    const history = normalizeDonationHistory(currentMeta.donationHistory);
    history.push({ amount, date: donationDate });

    const monthlyTotal = getMonthlyDonationTotal(history, donationDate);
    const computedTier = getPremiumTierByDonation(monthlyTotal);
    const wasPremium = Boolean(currentMeta.isPremium);
    const enablePremium = Boolean(computedTier);

    const nextMeta = {
      ...currentMeta,
      donationHistory: serializeDonationHistory(history),
      donationDate: donationDate.toISOString(),
      donationAmount: monthlyTotal,
      tierLevel: computedTier?.level,
    };

    if (enablePremium) {
      nextMeta.isPremium = true;
      if (!nextMeta.premiumSince) {
        nextMeta.premiumSince = new Date().toISOString();
      }
    }

    await databases.updateDocument(
      databaseId,
      "users",
      userDoc.$id,
      { premiumMeta: JSON.stringify(nextMeta) }
    );

    const logMetadata = {
      donationAmount: monthlyTotal,
      tierLevel: computedTier?.level,
      tierLabel: computedTier?.label,
      entryAmount: amount,
      entryDate: donationDate.toISOString(),
      source: "kofi",
      kofiType,
      isSubscription,
      messageId: payload.message_id || payload?.messageId,
      fromName,
      email,
      currency: payload.currency,
    };

    await databases.createDocument(
      databaseId,
      "admin_action_logs",
      ID.unique(),
      {
        action: "premium_tier_update",
        performedBy: "kofi",
        targetUserId: userDoc.$id,
        metadata: encodeMetadata(logMetadata),
        createdAt: new Date().toISOString(),
      }
    );

    const notificationTitle = "Premium tier updated";
    const notificationMessage = computedTier
      ? `Your account is now ${computedTier.label} after donating $${monthlyTotal.toFixed(
          2
        )} this month.`
      : "Your donation record has been updated.";

    await databases.createDocument(
      databaseId,
      "notifications",
      ID.unique(),
      {
        userId: userDoc.$id,
        type: "admin_message",
        title: notificationTitle,
        message: notificationMessage,
        read: false,
        createdAt: new Date().toISOString(),
      }
    );

    if (!wasPremium && enablePremium) {
      await postSystemEvent(
        {
          type: "premium_status_changed",
          userId: userDoc.$id,
          metadata: { enabled: true, performedBy: "kofi" },
        },
        log,
        logError
      );
    }

    const emailNotificationsEnabled = toBoolean(
      userDoc.emailNotificationsEnabled,
      false
    );

    if (emailNotificationsEnabled) {
      await postSystemEvent(
        {
          type: "notification_email",
          userId: userDoc.$id,
          metadata: {
            notificationId: null,
            type: "admin_message",
            title: notificationTitle,
            message: notificationMessage,
          },
        },
        log,
        logError
      );
    }

    log(
      `Updated premium metadata for ${userDoc.username} (${userDoc.$id}). Total this month: $${monthlyTotal}`
    );

    return {
      success: true,
      message: `Updated donations for ${userDoc.username}. Total: $${monthlyTotal}`,
      donationAmount: monthlyTotal,
      tierLevel: computedTier?.level,
    };
  } catch (error) {
    logError("Webhook error:", error);
    return { error: "Internal server error" };
  }
};
