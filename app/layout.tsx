import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { StoreProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Anime Stock Exchange",
  description: "Trade your favorite anime characters",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased min-h-screen flex flex-col`}>
        <StoreProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
        </StoreProvider>
        <Analytics />
      </body>
    </html>
  );
}
