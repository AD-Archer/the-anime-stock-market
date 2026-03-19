import crypto from "crypto";

export type UnsubscribePreference =
  | "general"
  | "trade"
  | "daily_trade_digest"
  | "weekly_performance"
  | "weekly_return"
  | "all";

type UnsubscribeTokenPayload = {
  userId: string;
  preference: UnsubscribePreference;
  exp: number;
};

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET ||
    process.env.APPWRITE_API_KEY ||
    "local-dev-unsubscribe-secret"
  );
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function decodeBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signEncodedPayload(encodedPayload: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createUnsubscribeToken(
  userId: string,
  preference: UnsubscribePreference,
  options?: { ttlSeconds?: number }
): string {
  const exp =
    Math.floor(Date.now() / 1000) +
    (options?.ttlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS);
  const payload: UnsubscribeTokenPayload = {
    userId,
    preference,
    exp,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signEncodedPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyUnsubscribeToken(
  token: string
): UnsubscribeTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signEncodedPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== providedBuffer.length) return null;
  if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) return null;

  try {
    const payload = JSON.parse(
      decodeBase64Url(encodedPayload)
    ) as UnsubscribeTokenPayload;
    if (
      !payload?.userId ||
      !payload?.preference ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildUnsubscribeUrl(
  siteUrl: string,
  userId: string,
  preference: UnsubscribePreference
): string {
  const token = createUnsubscribeToken(userId, preference);
  return `${siteUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function preferenceToUserFields(
  preference: UnsubscribePreference
): Record<string, boolean> {
  switch (preference) {
    case "general":
      return { emailNotificationsEnabled: false };
    case "trade":
      return { tradeEmailNotifications: false };
    case "daily_trade_digest":
      return { dailyTradeDigestEmailNotifications: false };
    case "weekly_performance":
      return { weeklyPerformanceEmailNotifications: false };
    case "weekly_return":
      return { weeklyReturnToAppEmailNotifications: false };
    case "all":
      return {
        emailNotificationsEnabled: false,
        tradeEmailNotifications: false,
        dailyTradeDigestEmailNotifications: false,
        weeklyPerformanceEmailNotifications: false,
        weeklyReturnToAppEmailNotifications: false,
        directMessageEmailNotifications: false,
      };
    default:
      return {};
  }
}
