import type { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

export const metadata: Metadata = {
  title: "Leaderboard - Top Traders | Anime Stock Market",
  description:
    "View the top traders and their performance on the Anime Stock Market. See who's making the best investment decisions and leading the competition.",
  keywords: [
    "anime stock leaderboard",
    "top traders",
    "best performers",
    "trading rankings",
    "anime stock market leaders",
  ],
  alternates: {
    canonical: `${baseUrl}/leaderboard`,
  },
  openGraph: {
    title: "Leaderboard - Top Traders",
    description:
      "See the best traders and their rankings on the Anime Stock Market",
    url: `${baseUrl}/leaderboard`,
    type: "website",
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
