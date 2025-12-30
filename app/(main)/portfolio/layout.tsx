import type { Metadata } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";

export const metadata: Metadata = {
  title: "My Portfolio - Track Your Holdings | Anime Stock Market",
  description:
    "View and manage your anime stock portfolio. Track your investments, see performance analytics, and manage your trading positions.",
  keywords: [
    "anime stock portfolio",
    "my holdings",
    "investment tracking",
    "stock performance",
    "trading dashboard",
  ],
  alternates: {
    canonical: `${baseUrl}/portfolio`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
