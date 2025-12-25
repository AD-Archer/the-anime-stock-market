import type React from "react";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  process.env.NEXT_PUBLIC_SITE_URL || "https://animestockexchange.adarcher.app";
const defaultOg = `${baseUrl}/icons/icon1.png`;

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
  title: "Anime Stock Exchange",
  description: "Trade your favorite anime characters",
  icons: {
    icon: defaultOg,
    apple: "/icons/apple-icon.png",
    shortcut: defaultOg,
  },
  openGraph: {
    title: "Anime Stock Exchange",
    description: "Trade your favorite anime characters in real-time",
    url: baseUrl,
    siteName: "Anime Stock Exchange",
    images: [
      {
        url: defaultOg,
        alt: "Anime Stock Exchange Open Graph",
      },
    ],
    type: "website",
  },
  manifest: "/icons/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AnimeStock",
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
  return (
    <html lang="en" suppressHydrationWarning={true}>
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
