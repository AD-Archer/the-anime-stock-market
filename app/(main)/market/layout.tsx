import type { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

export const metadata: Metadata = {
  title: "Anime Stock Market - Trade Your Favorite Characters",
  description:
    "Buy and sell stocks of your favorite anime characters. Trade in real-time as prices fluctuate based on community activity, rankings, and character popularity. Start investing today!",
  keywords: [
    "anime stocks",
    "anime trading",
    "anime characters",
    "stock market simulation",
    "anime investment game",
    "buy anime stocks",
    "trade anime",
    "character stocks",
    "anime market",
    "Anime stock market",
    "One Piece stocks",
    "One Piece stock market",
    "Luffy stocks",
    "Shanks stock market",
    "Shanks stocks",
    "Mihawk stocks",
    "Mihawk stock market",
    "stock trading game",
    "anime community",
    "virtual trading",
  ],
  alternates: {
    canonical: `${baseUrl}/market`,
  },
  openGraph: {
    title: "Anime Stock Market - Trade & Invest",
    description:
      "Trade your favorite anime characters on the most interactive anime stock market. Buy, sell, and profit!",
    url: `${baseUrl}/market`,
    type: "website",
    siteName: "Anime Stock Market",
  },
};

export default function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
