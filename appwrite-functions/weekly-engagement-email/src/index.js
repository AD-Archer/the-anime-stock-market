const { Client, Databases, Messaging, ID, Query } = require("node-appwrite");
const crypto = require("crypto");

const USERS_COLLECTION = "users";
const PORTFOLIOS_COLLECTION = "portfolios";
const STOCKS_COLLECTION = "stocks";
const PAGE_SIZE = 100;
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

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
  // New Appwrite runtimes pass a single object: { req, res, log, error }.
  if (
    arg1 &&
    typeof arg1 === "object" &&
    ("req" in arg1 || "res" in arg1 || "log" in arg1 || "error" in arg1)
  ) {
    return {
      req: arg1.req,
      res: arg1.res,
      log: typeof arg1.log === "function" ? arg1.log.bind(arg1) : null,
      error: typeof arg1.error === "function" ? arg1.error.bind(arg1) : null,
    };
  }

  // Legacy shape: (req, res, context)
  return {
    req: arg1,
    res: arg2,
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

const toBoolean = (value) => value === true || value === "true";

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

const createPerformanceCardToken = (payload, secret) => {
  const exp = Math.floor(Date.now() / 1000) + DEFAULT_TOKEN_TTL_SECONDS;
  const encodedPayload = encodeBase64Url(
    JSON.stringify({
      name: String(payload.name || "Trader").slice(0, 40),
      portfolioValue: toNumber(payload.portfolioValue, 0),
      pnl: toNumber(payload.pnl, 0),
      pnlPct: toNumber(payload.pnlPct, 0),
      topMovers: Array.isArray(payload.topMovers)
        ? payload.topMovers
            .slice(0, 4)
            .map((m) => ({
              name: String(m?.name || "Unknown").slice(0, 40),
              pnl: toNumber(m?.pnl, 0),
            }))
        : [],
      generatedAt: payload.generatedAt || new Date().toISOString(),
      exp,
    })
  );
  const signature = signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
};

const buildPerformanceCardUrl = (siteUrl, payload, secret) =>
  `${siteUrl}/api/email/performance-card?token=${encodeURIComponent(
    createPerformanceCardToken(payload, secret)
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

const canReceiveWeeklyEmail = (user) => {
  if (!user || !user.email) return false;
  if (!toBoolean(user.emailNotificationsEnabled)) return false;
  if (toBoolean(user.isBanned)) return false;
  if (toDate(user.pendingDeletionAt)) return false;
  return true;
};

const buildPortfolioSummary = (userId, groupedPortfolios, stocksById) => {
  const holdings = (groupedPortfolios.get(userId) || [])
    .filter((p) => toNumber(p.shares, 0) > 0)
    .map((portfolio) => {
      const stock = stocksById.get(portfolio.stockId);
      if (!stock) return null;
      const shares = toNumber(portfolio.shares, 0);
      const avgBuy = toNumber(portfolio.averageBuyPrice, 0);
      const currentPrice = toNumber(stock.currentPrice, 0);
      const currentValue = shares * currentPrice;
      const costBasis = shares * avgBuy;
      const pnl = currentValue - costBasis;
      return {
        stockName: stock.characterName || "Unknown",
        shares,
        avgBuy,
        currentPrice,
        currentValue,
        costBasis,
        pnl,
      };
    })
    .filter(Boolean);

  const portfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const costBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const pnl = portfolioValue - costBasis;
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

  const topMovers = [...holdings]
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 5);

  return {
    holdings,
    portfolioValue,
    costBasis,
    pnl,
    pnlPct,
    topMovers,
  };
};

const sendUserEmail = async ({
  messaging,
  userId,
  subject,
  html,
  log,
}) => {
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
      `Failed sending email to user=${userId}, subject="${subject}": ${
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
  const unsubscribeSecret =
    process.env.EMAIL_UNSUBSCRIBE_SECRET || apiKey || "local-dev-secret";
  const performanceCardSecret =
    process.env.EMAIL_PERFORMANCE_CARD_SECRET ||
    process.env.EMAIL_UNSUBSCRIBE_SECRET ||
    apiKey ||
    "local-dev-performance-card-secret";
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

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  const databases = new Databases(client);
  const messaging = new Messaging(client);

  try {
    log("Weekly engagement email job started");
    const [users, portfolios, stocks] = await Promise.all([
      listAllDocuments(databases, databaseId, USERS_COLLECTION, log),
      listAllDocuments(databases, databaseId, PORTFOLIOS_COLLECTION, log),
      listAllDocuments(databases, databaseId, STOCKS_COLLECTION, log),
    ]);

    const stocksById = new Map();
    stocks.forEach((stock) => {
      if (stock.$id) stocksById.set(stock.$id, stock);
      if (stock.id) stocksById.set(stock.id, stock);
    });
    const groupedPortfolios = portfolios.reduce((acc, portfolio) => {
      const userId = portfolio.userId;
      if (!userId) return acc;
      if (!acc.has(userId)) acc.set(userId, []);
      acc.get(userId).push(portfolio);
      return acc;
    }, new Map());

    let performanceSent = 0;
    let returnSent = 0;

    for (const user of users) {
      const userId = user.$id || user.id;
      if (!userId || !canReceiveWeeklyEmail(user)) continue;

      const wantsPerformance = toBoolean(user.weeklyPerformanceEmailNotifications);
      const wantsReturn = toBoolean(user.weeklyReturnToAppEmailNotifications);

      if (wantsPerformance) {
        const summary = buildPortfolioSummary(userId, groupedPortfolios, stocksById);
        const username = user.username || user.displayName || "Trader";
        const profileUrl = `${siteUrl}/portfolio`;
        const unsubscribePerformanceUrl = buildUnsubscribeUrl(
          siteUrl,
          userId,
          "weekly_performance",
          unsubscribeSecret
        );
        const unsubscribeReturnUrl = buildUnsubscribeUrl(
          siteUrl,
          userId,
          "weekly_return",
          unsubscribeSecret
        );
        const unsubscribeAllUrl = buildUnsubscribeUrl(
          siteUrl,
          userId,
          "all",
          unsubscribeSecret
        );
        const performanceCardUrl = buildPerformanceCardUrl(
          siteUrl,
          {
            name: username,
            portfolioValue: summary.portfolioValue,
            pnl: summary.pnl,
            pnlPct: summary.pnlPct,
            topMovers: summary.topMovers.map((item) => ({
              name: item.stockName,
              pnl: item.pnl,
            })),
            generatedAt: new Date().toISOString(),
          },
          performanceCardSecret
        );
        const totalLine = `${formatMoney(summary.portfolioValue)} (${summary.pnl >= 0 ? "+" : ""}${formatMoney(summary.pnl)} / ${summary.pnlPct.toFixed(2)}%)`;
        const moversHtml =
          summary.topMovers.length === 0
            ? "<li>No holdings yet. Start building your portfolio this week.</li>"
            : summary.topMovers
                .map(
                  (item) =>
                    `<li><strong>${item.stockName}</strong>: ${item.shares.toLocaleString()} shares, ${item.pnl >= 0 ? "+" : ""}${formatMoney(item.pnl)}</li>`
                )
                .join("");

        const html = `
<p>Hi ${username},</p>
<p>Here is your weekly Anime Stock Market performance digest.</p>
<p>
  <img src="${performanceCardUrl}" alt="Weekly performance card" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;border-radius:14px" />
</p>
<p><strong>Portfolio value:</strong> ${totalLine}</p>
<p><strong>Top movers:</strong></p>
<ul>${moversHtml}</ul>
<p><a href="${profileUrl}">Return to the app and review your positions</a>.</p>
<p style="font-size:12px;color:#666">
  <a href="${unsubscribePerformanceUrl}">Unsubscribe from performance emails</a> ·
  <a href="${unsubscribeReturnUrl}">Unsubscribe from return reminders</a> ·
  <a href="${unsubscribeAllUrl}">Unsubscribe from all emails</a>
</p>
        `.trim();

        const sent = await sendUserEmail({
          messaging,
          userId,
          subject:
            "[Anime Stock Market] Your weekly portfolio performance digest",
          html,
          log,
        });
        if (sent) performanceSent++;
      }

      // Avoid duplicate weekly sends if user already receives the performance digest.
      if (wantsReturn && !wantsPerformance) {
        const username = user.username || user.displayName || "Trader";
        const marketUrl = `${siteUrl}/market`;
        const portfolioUrl = `${siteUrl}/portfolio`;
        const summary = buildPortfolioSummary(userId, groupedPortfolios, stocksById);
        const unsubscribeReturnUrl = buildUnsubscribeUrl(
          siteUrl,
          userId,
          "weekly_return",
          unsubscribeSecret
        );
        const unsubscribeAllUrl = buildUnsubscribeUrl(
          siteUrl,
          userId,
          "all",
          unsubscribeSecret
        );
        const performanceCardUrl = buildPerformanceCardUrl(
          siteUrl,
          {
            name: username,
            portfolioValue: summary.portfolioValue,
            pnl: summary.pnl,
            pnlPct: summary.pnlPct,
            topMovers: summary.topMovers.map((item) => ({
              name: item.stockName,
              pnl: item.pnl,
            })),
            generatedAt: new Date().toISOString(),
          },
          performanceCardSecret
        );
        const html = `
<p>Hi ${username},</p>
<p>The market has moved this week and your portfolio is waiting.</p>
<p>
  <img src="${performanceCardUrl}" alt="Portfolio snapshot card" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;border-radius:14px" />
</p>
<p><a href="${portfolioUrl}">Check your holdings</a> or <a href="${marketUrl}">discover trending stocks</a>.</p>
<p>See you back in the app.</p>
<p style="font-size:12px;color:#666">
  <a href="${unsubscribeReturnUrl}">Unsubscribe from return reminders</a> ·
  <a href="${unsubscribeAllUrl}">Unsubscribe from all emails</a>
</p>
        `.trim();

        const sent = await sendUserEmail({
          messaging,
          userId,
          subject: "[Anime Stock Market] Weekly reminder: come back to the app",
          html,
          log,
        });
        if (sent) returnSent++;
      }
    }

    const result = {
      success: true,
      usersProcessed: users.length,
      performanceSent,
      returnSent,
    };
    log(`Weekly engagement email job complete: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    logError("Weekly engagement email job failed", error);
    return { error: "Internal server error" };
  }
};
