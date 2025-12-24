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
// @ts-ignore: allow side-effect CSS import without type declarations
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Anime Stock Exchange",
  description: "Trade your favorite anime characters",
  icons: {
    icon: "/icons/favicon.ico",
    apple: "/icons/apple-icon.png",
    shortcut: "/icons/favicon.ico",
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
      </body>
    </html>
  );
}

function StackedProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={<PageShellLoading titleWidth="w-48" subtitleWidth="w-72" />}
    >
      <StoreProvider>
        {children}
      </StoreProvider>
    </Suspense>
  );
}
