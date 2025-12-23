import type React from "react";
import Header from "@/components/header";
import { Footer } from "@/components/footer";
import { BannedGate } from "@/components/banned-gate";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <BannedGate>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </BannedGate>
  );
}
