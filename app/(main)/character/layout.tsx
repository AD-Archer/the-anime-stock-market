import type { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

export const metadata: Metadata = {
  title: "Character Stocks - Trade Anime Characters | Anime Stock Market",
  description:
    "Browse and trade stocks of your favorite anime characters. Real-time prices and live trading on the Anime Stock Market.",
  keywords: [
    "character stocks",
    "anime character trading",
    "buy stocks",
    "stock trading",
  ],
  alternates: {
    canonical: `${baseUrl}/character`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CharacterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
