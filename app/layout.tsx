import type React from "react";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { StoreProvider } from "@/lib/store";
import { SiteStickyTicker } from "@/components/site-sticky-ticker";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { AuthProvider } from "@/lib/auth";
import { PageShellLoading } from "@/components/loading/page-shell";
import { ThemeProvider } from "@/components/theme-provider";
import PlausibleInit from "@/components/analytics/plausible-init";
// @ts-ignore: allow side-effect CSS import without type declarations
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.animestockmarket.tech";
const defaultOg = `${baseUrl}/icons/images.jpg`;

// Theme script to prevent flash
const themeScript = `(function() {
    function getTheme() {
      try {
        const stored = localStorage.getItem('theme');
        if (stored) {
          return stored === 'system' 
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : stored;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch (e) {
        return 'light';
      }
    }
    
    const theme = getTheme();
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  })();`;

export const metadata: Metadata = {
  title: "The Anime Stock Market - Trade Your Favorite Anime Characters",
  description:
    "Buy and sell stocks of your favorite anime characters. Experience a unique virtual stock market where character popularity drives prices. Join thousands of traders today!",
  keywords: [
    "anime stocks",
    "anime trading",
    "anime characters",
    "stock market simulation",
    "anime investment game",
    "buy anime stocks",
    "trade anime characters",
    "virtual stock exchange",
    "anime market",
    "character stocks",
    "anime rankings",
    "stock trading game",
    "anime community",
  ],
  icons: {
    icon: defaultOg,
    apple: "/icons/apple-icon.png",
    shortcut: defaultOg,
  },
  openGraph: {
    title: "The Anime Stock Market - Trade Your Favorite Characters",
    description:
      "Buy, sell, and trade stocks of popular anime characters. Watch prices move with real community activity!",
    url: baseUrl,
    siteName: "Anime Stock Market",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: defaultOg,
        width: 1200,
        height: 630,
        alt: "Anime Stock Market - Trade Anime Characters",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Anime Stock Market",
    description: "Trade your favorite anime characters",
    images: [defaultOg],
  },
  manifest: "/icons/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AnimeStock",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: baseUrl,
  },
};

export const viewport: Viewport = {
  themeColor: "#2858ac",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "The Anime Stock Market",
    description:
      "A virtual stock market where you can trade stocks of your favorite anime characters",
    url: baseUrl,
    applicationCategory: "Game",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    image: defaultOg,
    creator: {
      "@type": "Organization",
      name: "Anime Stock Market",
      url: baseUrl,
    },
  };

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      </head>
      <body className={`font-sans antialiased min-h-screen flex flex-col`}>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={["light", "dark"]}
        >
          <TooltipProvider>
            <AuthProvider>
              <div className="pt-10 md:pt-14">
                <StackedProviders>
                  <SiteStickyTicker />
                  {children}
                  <Toaster />
                </StackedProviders>
              </div>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
        {/* Initialize Plausible via client component (plausible-tracker) */}
        <PlausibleInit />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-623N2CDXHC"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-623N2CDXHC');
          `}
        </Script>
      </body>
    </html>
  );
}

function StackedProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={<PageShellLoading titleWidth="w-48" subtitleWidth="w-72" />}
    >
      <StoreProvider>{children}</StoreProvider>
    </Suspense>
  );
}
