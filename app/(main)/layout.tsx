import type React from "react";
import Header from "@/components/header";
import { Footer } from "@/components/footer";
import { BannedGate } from "@/components/banned-gate";
import { WelcomeJoinPopup } from "@/components/welcome-join-popup";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <BannedGate>
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden">
        <Header />
        <WelcomeJoinPopup />
        <main className="flex-1 w-full min-w-0">{children}</main>
        <Footer />
      </div>
    </BannedGate>
  );
}
