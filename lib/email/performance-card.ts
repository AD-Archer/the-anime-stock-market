import crypto from "crypto";

export type PerformanceCardMover = {
  name: string;
  pnl: number;
};

type PerformanceCardTokenPayload = {
  name: string;
  portfolioValue: number;
  pnl: number;
  pnlPct: number;
  topMovers: PerformanceCardMover[];
  generatedAt: string;
  exp: number;
};

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  return (
    process.env.EMAIL_PERFORMANCE_CARD_SECRET ||
    process.env.EMAIL_UNSUBSCRIBE_SECRET ||
    process.env.APPWRITE_API_KEY ||
    "local-dev-performance-card-secret"
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

function clampNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeName(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "Trader";
  return raw.slice(0, 40);
}

function sanitizeMover(value: unknown): PerformanceCardMover | null {
  if (!value || typeof value !== "object") return null;
  const name = sanitizeName((value as any).name);
  const pnl = clampNumber((value as any).pnl, 0);
  return { name, pnl };
}

export function createPerformanceCardToken(
  payload: {
    name: string;
    portfolioValue: number;
    pnl: number;
    pnlPct: number;
    topMovers?: PerformanceCardMover[];
    generatedAt?: string;
  },
  options?: { ttlSeconds?: number }
): string {
  const exp =
    Math.floor(Date.now() / 1000) +
    (options?.ttlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS);
  const normalized: PerformanceCardTokenPayload = {
    name: sanitizeName(payload.name),
    portfolioValue: clampNumber(payload.portfolioValue, 0),
    pnl: clampNumber(payload.pnl, 0),
    pnlPct: clampNumber(payload.pnlPct, 0),
    topMovers: (payload.topMovers || [])
      .map((item) => sanitizeMover(item))
      .filter((item): item is PerformanceCardMover => item !== null)
      .slice(0, 4),
    generatedAt:
      typeof payload.generatedAt === "string"
        ? payload.generatedAt
        : new Date().toISOString(),
    exp,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(normalized));
  const signature = signEncodedPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyPerformanceCardToken(
  token: string
): Omit<PerformanceCardTokenPayload, "exp"> | null {
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
    ) as PerformanceCardTokenPayload;
    if (!payload || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      name: sanitizeName(payload.name),
      portfolioValue: clampNumber(payload.portfolioValue, 0),
      pnl: clampNumber(payload.pnl, 0),
      pnlPct: clampNumber(payload.pnlPct, 0),
      topMovers: (payload.topMovers || [])
        .map((item) => sanitizeMover(item))
        .filter((item): item is PerformanceCardMover => item !== null)
        .slice(0, 4),
      generatedAt:
        typeof payload.generatedAt === "string"
          ? payload.generatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function buildPerformanceCardUrl(
  siteUrl: string,
  payload: {
    name: string;
    portfolioValue: number;
    pnl: number;
    pnlPct: number;
    topMovers?: PerformanceCardMover[];
    generatedAt?: string;
  }
): string {
  const token = createPerformanceCardToken(payload);
  return `${siteUrl}/api/email/performance-card?token=${encodeURIComponent(
    token
  )}`;
}

export function formatMoney(value: number): string {
  return `$${clampNumber(value, 0).toFixed(2)}`;
}
