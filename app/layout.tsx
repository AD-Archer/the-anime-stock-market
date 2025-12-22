import type React from "react";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "../stack/client";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/toaster";
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
    <html lang="en">
      <body className={`font-sans antialiased min-h-screen flex flex-col`}>
        <StackProvider app={stackClientApp}>
          <StackTheme>
            <StoreProvider>
              {children}
              <Toaster />
            </StoreProvider>
            <Analytics />
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
