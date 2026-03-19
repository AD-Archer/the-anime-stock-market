const { Client, Databases, Messaging, ID, Query } = require("node-appwrite");
const crypto = require("crypto");

const USERS_COLLECTION = "users";
const TRANSACTIONS_COLLECTION = "transactions";
const STOCKS_COLLECTION = "stocks";
const METADATA_COLLECTION = "metadata";
const PAGE_SIZE = 100;
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const ET_TIME_ZONE = "America/New_York";
const DEFAULT_DIGEST_HOUR_ET = 17;
const DIGEST_DAY_METADATA_KEY_PREFIX = "trade_digest_sent_for_day_";

const pickFirst = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
};

const getHeader = (req, name) => {
  if (!req || !req.headers) return "";
  const key = Object.keys(req.headers).find(
    (header) => header.toLowerCase() === name.toLowerCase()
  );
  const value = key ? req.headers[key] : undefined;
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) {
    return String(value[0] || "");
  }
  return "";
};

const resolveInvocation = (arg1, arg2, arg3) => {
  if (
    arg1 &&
    typeof arg1 === "object" &&
    ("req" in arg1 || "res" in arg1 || "log" in arg1 || "error" in arg1)
  ) {
    return {
      req: arg1.req,
      log: typeof arg1.log === "function" ? arg1.log.bind(arg1) : null,
      error: typeof arg1.error === "function" ? arg1.error.bind(arg1) : null,
    };
  }

  return {
    req: arg1,
    log:
      arg3 && typeof arg3.log === "function" ? arg3.log.bind(arg3) : null,
    error:
      arg3 && typeof arg3.error === "function"
        ? arg3.error.bind(arg3)
        : null,
  };
};

const resolveAppwriteConfig = (req) => {
  const endpoint = pickFirst(
    process.env.APPWRITE_ENDPOINT,
    process.env.APPWRITE_FUNCTION_API_ENDPOINT,
    process.env.APPWRITE_FUNCTION_ENDPOINT
  );
  const projectId = pickFirst(
    process.env.APPWRITE_PROJECT_ID,
    process.env.APPWRITE_FUNCTION_PROJECT_ID
  );
  const apiKey = pickFirst(
    process.env.APPWRITE_API_KEY,
    process.env.APPWRITE_FUNCTION_API_KEY,
    getHeader(req, "x-appwrite-key")
  );
  const databaseId = pickFirst(
    process.env.APPWRITE_DATABASE_ID,
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID
  );

  return { endpoint, projectId, apiKey, databaseId };
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatMoney = (value) => `$${toNumber(value, 0).toFixed(2)}`;

const encodeBase64Url = (value) =>
  Buffer.from(value, "utf8").toString("base64url");

const signPayload = (encodedPayload, secret) =>
  crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");

const createUnsubscribeToken = (userId, preference, secret) => {
  const exp = Math.floor(Date.now() / 1000) + DEFAULT_TOKEN_TTL_SECONDS;
  const payload = encodeBase64Url(
    JSON.stringify({ userId, preference, exp })
  );
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
};

const buildUnsubscribeUrl = (siteUrl, userId, preference, secret) =>
  `${siteUrl}/api/email/unsubscribe?token=${encodeURIComponent(
    createUnsubscribeToken(userId, preference, secret)
  )}`;

const listAllDocuments = async (databases, databaseId, collectionId, log) => {
  const all = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
    ]);

    all.push(...response.documents);
    if (response.documents.length < PAGE_SIZE) {
      break;
    }

    offset += response.documents.length;
    log(
      `Fetched ${collectionId}: ${all.length}/${response.total ?? "unknown"}`
    );
  }

  return all;
};

const listUserBuyTransactions = async ({
  databases,
  databaseId,
  userId,
  fromIso,
  toIso,
}) => {
  const all = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(
      databaseId,
      TRANSACTIONS_COLLECTION,
      [
        Query.equal("userId", userId),
        Query.equal("type", "buy"),
        Query.greaterThanEqual("timestamp", fromIso),
        Query.lessThan("timestamp", toIso),
        Query.orderAsc("timestamp"),
        Query.limit(PAGE_SIZE),
        Query.offset(offset),
      ]
    );

    all.push(...response.documents);
    if (response.documents.length < PAGE_SIZE) {
      break;
    }

    offset += response.documents.length;
  }

  return all;
};

const getMetadataNumber = async (databases, databaseId, key, log) => {
  try {
    const response = await databases.listDocuments(databaseId, METADATA_COLLECTION, [
      Query.equal("key", key),
      Query.limit(1),
    ]);
    if (response.documents.length === 0) return null;
    const value = Number(response.documents[0].value);
    return Number.isFinite(value) ? value : null;
  } catch (error) {
    log(`Failed to read metadata key=${key}: ${error?.message || error}`);
    return null;
  }
};

const setMetadataNumber = async (databases, databaseId, key, value) => {
  const response = await databases.listDocuments(databaseId, METADATA_COLLECTION, [
    Query.equal("key", key),
    Query.limit(1),
  ]);

  if (response.documents.length > 0) {
    await databases.updateDocument(
      databaseId,
      METADATA_COLLECTION,
      response.documents[0].$id,
      {
        value,
        updatedAt: new Date().toISOString(),
      }
    );
    return;
  }

  await databases.createDocument(databaseId, METADATA_COLLECTION, ID.unique(), {
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
};

const canReceiveTradeDigest = (user) => {
  if (!user || !user.email) return false;
  if (!toBoolean(user.emailNotificationsEnabled, true)) return false;
  if (!toBoolean(user.dailyTradeDigestEmailNotifications, true)) return false;
  if (toBoolean(user.isBanned, false)) return false;
  if (toDate(user.pendingDeletionAt)) return false;
  return true;
};

const getTimeZoneParts = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const out = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      out[part.type] = Number(part.value);
    }
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour,
    minute: out.minute,
    second: out.second,
  };
};

const zonedDateTimeToUtc = (
  timeZone,
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0
) => {
  const utcGuessMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const guessDate = new Date(utcGuessMs);
  const guessedLocal = getTimeZoneParts(guessDate, timeZone);
  const guessedAsUtcMs = Date.UTC(
    guessedLocal.year,
    guessedLocal.month - 1,
    guessedLocal.day,
    guessedLocal.hour,
    guessedLocal.minute,
    guessedLocal.second
  );
  const offsetMs = guessedAsUtcMs - utcGuessMs;
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - offsetMs);
};

const toEtDayKey = (parts) =>
  parts.year * 10000 + parts.month * 100 + parts.day;

const formatEtDay = (parts) =>
  `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day
  ).padStart(2, "0")}`;

const summarizeBuys = (transactions, stocksById) => {
  const grouped = new Map();

  for (const tx of transactions) {
    const stockId = tx.stockId;
    if (!stockId) continue;

    if (!grouped.has(stockId)) {
      const stock = stocksById.get(stockId);
      grouped.set(stockId, {
        stockId,
        stockName: stock?.characterName || "Unknown Stock",
        anime: stock?.anime || "",
        shares: 0,
        totalSpent: 0,
        tradeCount: 0,
      });
    }

    const current = grouped.get(stockId);
    current.shares += toNumber(tx.shares, 0);
    current.totalSpent += toNumber(tx.totalAmount, 0);
    current.tradeCount += 1;
  }

  const rows = Array.from(grouped.values()).map((row) => ({
    ...row,
    avgPrice: row.shares > 0 ? row.totalSpent / row.shares : 0,
  }));

  rows.sort((a, b) => b.totalSpent - a.totalSpent);

  const totals = rows.reduce(
    (acc, row) => {
      acc.totalShares += row.shares;
      acc.totalSpent += row.totalSpent;
      acc.tradeCount += row.tradeCount;
      return acc;
    },
    { totalShares: 0, totalSpent: 0, tradeCount: 0 }
  );

  return { rows, totals };
};

const sendUserEmail = async ({ messaging, userId, subject, html, log }) => {
  try {
    await messaging.createEmail({
      messageId: ID.unique(),
      subject,
      content: html,
      users: [userId],
      html: true,
      draft: false,
    });
    return true;
  } catch (error) {
    log(
      `Failed sending digest email to user=${userId}, subject="${subject}": ${
        error?.message || error
      }`
    );
    return false;
  }
};

module.exports = async (arg1, arg2, arg3) => {
  const { req, log: runtimeLog, error: runtimeError } = resolveInvocation(
    arg1,
    arg2,
    arg3
  );
  const log = runtimeLog || console.log;
  const logError = runtimeError || console.error;

  const { endpoint, projectId, apiKey, databaseId } =
    resolveAppwriteConfig(req);

  const digestHourEt = toNumber(
    process.env.TRADE_DIGEST_HOUR_ET,
    DEFAULT_DIGEST_HOUR_ET
  );
  const forceRun = toBoolean(process.env.TRADE_DIGEST_FORCE_RUN, false);

  const unsubscribeSecret =
    process.env.EMAIL_UNSUBSCRIBE_SECRET || apiKey || "local-dev-secret";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

  if (!endpoint || !projectId || !apiKey || !databaseId) {
    const missing = [];
    if (!endpoint) missing.push("APPWRITE_ENDPOINT");
    if (!projectId) missing.push("APPWRITE_PROJECT_ID");
    if (!apiKey) missing.push("APPWRITE_API_KEY");
    if (!databaseId) missing.push("APPWRITE_DATABASE_ID");
    logError(
      `Missing required Appwrite environment variables: ${missing.join(", ")}`
    );
    return { error: "Missing required configuration", missing };
  }

  const now = new Date();
  const nowEt = getTimeZoneParts(now, ET_TIME_ZONE);
  if (!forceRun && nowEt.hour !== digestHourEt) {
    const skipped = {
      success: true,
      skipped: true,
      reason: "outside_trade_digest_hour",
      currentHourEt: nowEt.hour,
      expectedHourEt: digestHourEt,
      timestamp: now.toISOString(),
    };
    log(`Daily trade digest skipped: ${JSON.stringify(skipped)}`);
    return skipped;
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  const databases = new Databases(client);
  const messaging = new Messaging(client);

  try {
    log("Daily trade digest job started");

    const [users, stocks] = await Promise.all([
      listAllDocuments(databases, databaseId, USERS_COLLECTION, log),
      listAllDocuments(databases, databaseId, STOCKS_COLLECTION, log),
    ]);

    const stocksById = new Map();
    for (const stock of stocks) {
      if (stock.$id) stocksById.set(stock.$id, stock);
      if (stock.id) stocksById.set(stock.id, stock);
    }

    const startOfCurrentEtDayUtc = zonedDateTimeToUtc(
      ET_TIME_ZONE,
      nowEt.year,
      nowEt.month,
      nowEt.day,
      0,
      0,
      0
    );
    const previousEtMoment = new Date(startOfCurrentEtDayUtc.getTime() - 1000);
    const previousEt = getTimeZoneParts(previousEtMoment, ET_TIME_ZONE);
    const startOfPreviousEtDayUtc = zonedDateTimeToUtc(
      ET_TIME_ZONE,
      previousEt.year,
      previousEt.month,
      previousEt.day,
      0,
      0,
      0
    );
    const digestDayKey = toEtDayKey(previousEt);
    const digestDayLabel = formatEtDay(previousEt);

    let usersEligible = 0;
    let usersWithPurchases = 0;
    let emailsSent = 0;
    let buysIncluded = 0;

    for (const user of users) {
      const userId = user.$id || user.id;
      if (!userId || !canReceiveTradeDigest(user)) continue;

      usersEligible += 1;
      const lastSentKey = `${DIGEST_DAY_METADATA_KEY_PREFIX}${userId}`;
      const lastSentDayKey = await getMetadataNumber(
        databases,
        databaseId,
        lastSentKey,
        log
      );
      if (
        Number.isFinite(lastSentDayKey) &&
        lastSentDayKey >= digestDayKey
      ) {
        continue;
      }

      const buys = await listUserBuyTransactions({
        databases,
        databaseId,
        userId,
        fromIso: startOfPreviousEtDayUtc.toISOString(),
        toIso: startOfCurrentEtDayUtc.toISOString(),
      });

      if (buys.length === 0) continue;

      const summary = summarizeBuys(buys, stocksById);
      const username = user.username || user.displayName || "Trader";
      const portfolioUrl = `${siteUrl}/portfolio`;
      const unsubscribeDigestUrl = buildUnsubscribeUrl(
        siteUrl,
        userId,
        "daily_trade_digest",
        unsubscribeSecret
      );
      const unsubscribeAllUrl = buildUnsubscribeUrl(
        siteUrl,
        userId,
        "all",
        unsubscribeSecret
      );

      const rowsHtml = summary.rows
        .map(
          (row) =>
            `<li><strong>${row.stockName}</strong>${
              row.anime ? ` (${row.anime})` : ""
            }: ${row.shares.toLocaleString()} shares, ${formatMoney(
              row.totalSpent
            )} total (${formatMoney(row.avgPrice)} avg/share)</li>`
        )
        .join("");

      const subject =
        summary.rows.length === 1
          ? "[Anime Stock Market] 1 stock you purchased yesterday"
          : `[Anime Stock Market] ${summary.rows.length} stocks you purchased yesterday`;

      const html = `
<p>Hi ${username},</p>
<p>You purchased these stocks on ${digestDayLabel} (ET):</p>
<ul>${rowsHtml}</ul>
<p><strong>Total buys:</strong> ${summary.totals.tradeCount.toLocaleString()} transaction${
        summary.totals.tradeCount === 1 ? "" : "s"
      }, <strong>Total shares:</strong> ${summary.totals.totalShares.toLocaleString()}, <strong>Total spent:</strong> ${formatMoney(
        summary.totals.totalSpent
      )}</p>
<p><a href="${portfolioUrl}">Open your portfolio</a> to review positions.</p>
<p style="font-size:12px;color:#666">This digest is sent the day after your buys at 5:00 PM ET.</p>
<p style="font-size:12px;color:#666">
  <a href="${unsubscribeDigestUrl}">Unsubscribe from daily trade digest emails</a> ·
  <a href="${unsubscribeAllUrl}">Unsubscribe from all emails</a>
</p>
      `.trim();

      const sent = await sendUserEmail({
        messaging,
        userId,
        subject,
        html,
        log,
      });

      if (!sent) continue;

      usersWithPurchases += 1;
      emailsSent += 1;
      buysIncluded += buys.length;

      await setMetadataNumber(
        databases,
        databaseId,
        lastSentKey,
        digestDayKey
      );
    }

    const result = {
      success: true,
      timestamp: now.toISOString(),
      digestForEtDay: digestDayLabel,
      usersProcessed: users.length,
      usersEligible,
      usersWithPurchases,
      emailsSent,
      buysIncluded,
    };
    log(`Daily trade digest job complete: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    logError("Daily trade digest job failed", error);
    return { error: "Internal server error" };
  }
};
