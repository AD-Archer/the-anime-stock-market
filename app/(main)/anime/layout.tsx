import type { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

export const metadata: Metadata = {
  title: "Anime Series - Character Stocks | Anime Stock Market",
  description:
    "Browse anime series and their character stocks. Explore popular anime and trade stocks of your favorite characters from each series.",
  keywords: [
    "anime series",
    "character stocks",
    "anime stocks",
    "manga",
    "anime trading",
  ],
  alternates: {
    canonical: `${baseUrl}/anime`,
  },
  openGraph: {
    title: "Anime Series - Browse & Trade",
    description:
      "Explore anime series and trade stocks of characters from your favorite shows",
    url: `${baseUrl}/anime`,
    type: "website",
  },
};

export default function AnimeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
