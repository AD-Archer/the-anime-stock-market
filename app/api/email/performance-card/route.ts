import { verifyPerformanceCardToken, formatMoney } from "@/lib/email/performance-card";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseNumber(value: string | null, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function truncateLabel(value: string, max = 28): string {
  const normalized = value.trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function demoPayload(searchParams: URLSearchParams) {
  const movers = [
    {
      name: (searchParams.get("m1n") || "Asuka Langley").slice(0, 40),
      pnl: parseNumber(searchParams.get("m1p"), 210),
    },
    {
      name: (searchParams.get("m2n") || "Lelouch Lamperouge").slice(0, 40),
      pnl: parseNumber(searchParams.get("m2p"), 122.1),
    },
    {
      name: (searchParams.get("m3n") || "Spike Spiegel").slice(0, 40),
      pnl: parseNumber(searchParams.get("m3p"), 90),
    },
  ];

  return {
    name: (searchParams.get("name") || "Trader").slice(0, 40),
    portfolioValue: parseNumber(searchParams.get("value"), 12430.12),
    pnl: parseNumber(searchParams.get("pnl"), 422.1),
    pnlPct: parseNumber(searchParams.get("pnlPct"), 3.51),
    topMovers: movers,
    generatedAt: new Date().toISOString(),
  };
}

function cardSvg(payload: {
  name: string;
  portfolioValue: number;
  pnl: number;
  pnlPct: number;
  topMovers: Array<{ name: string; pnl: number }>;
  generatedAt: string;
}) {
  const positive = payload.pnl >= 0;
  const pnlLabel = `${positive ? "+" : ""}${formatMoney(payload.pnl)} / ${
    positive ? "+" : ""
  }${payload.pnlPct.toFixed(2)}%`;
  const dateLabel = new Date(payload.generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const moverRows = payload.topMovers
    .slice(0, 4)
    .map((m, index) => {
      const y = 392 + index * 52;
      const moverPositive = m.pnl >= 0;
      const pnlText = `${moverPositive ? "+" : ""}${formatMoney(m.pnl)}`;
      const label = truncateLabel(m.name, 30);
      return `
  <rect x="76" y="${y - 30}" rx="12" ry="12" width="1048" height="46" fill="rgba(255,255,255,0.08)" />
  <text x="100" y="${y}" font-size="24" font-weight="600" fill="#f8fafc">${escapeXml(
    label
  )}</text>
  <text x="1096" y="${y}" font-size="24" font-weight="700" text-anchor="end" fill="${
    moverPositive ? "#86efac" : "#fda4af"
  }">${escapeXml(pnlText)}</text>
`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="Weekly performance card">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="55%" stop-color="#1d4ed8" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.05)" />
      <stop offset="50%" stop-color="rgba(255,255,255,0.20)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.05)" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <circle cx="1020" cy="-80" r="260" fill="rgba(56,189,248,0.20)" />
  <circle cx="170" cy="670" r="290" fill="rgba(20,184,166,0.20)" />
  <rect x="60" y="48" rx="24" ry="24" width="1080" height="534" fill="rgba(17,24,39,0.62)" stroke="rgba(255,255,255,0.18)" />
  <rect x="60" y="48" rx="24" ry="24" width="1080" height="60" fill="url(#shine)" />
  <text x="92" y="105" font-size="28" fill="#e2e8f0" font-weight="600">Anime Stock Market</text>
  <text x="1108" y="105" font-size="24" fill="#cbd5e1" text-anchor="end">${escapeXml(
    dateLabel
  )}</text>

  <text x="92" y="168" font-size="36" fill="#f8fafc" font-weight="700">${escapeXml(
    payload.name
  )}&apos;s Weekly Performance</text>
  <text x="92" y="224" font-size="30" fill="#cbd5e1">Portfolio Value</text>
  <text x="92" y="274" font-size="58" fill="#f8fafc" font-weight="800">${escapeXml(
    formatMoney(payload.portfolioValue)
  )}</text>
  <text x="620" y="274" font-size="34" fill="${
    positive ? "#86efac" : "#fda4af"
  }" font-weight="700">${escapeXml(pnlLabel)}</text>

  <text x="92" y="348" font-size="30" fill="#e2e8f0" font-weight="700">Top Movers</text>
  ${moverRows}
  <text x="92" y="575" font-size="21" fill="#cbd5e1">Track your favorite characters and keep compounding.</text>
</svg>`;
}

function imageResponse(svg: string, status = 200) {
  return new Response(svg, {
    status,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
    },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    if (searchParams.get("demo") === "1") {
      return imageResponse(cardSvg(demoPayload(searchParams)));
    }
    return imageResponse(cardSvg(demoPayload(new URLSearchParams())), 400);
  }

  const payload = verifyPerformanceCardToken(token);
  if (!payload) {
    return imageResponse(cardSvg(demoPayload(new URLSearchParams())), 400);
  }

  return imageResponse(
    cardSvg({
      ...payload,
      topMovers: payload.topMovers || [],
    })
  );
}
