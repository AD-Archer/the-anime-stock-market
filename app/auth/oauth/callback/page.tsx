"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { account } from "@/lib/appwrite";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const userId = search.get("userId");
  const secret = search.get("secret");
  const [status, setStatus] = useState("Completing OAuth sign-in...");

  useEffect(() => {
    if (!userId || !secret) return;

    const finish = async () => {
      try {
        await account.createSession(userId, secret);
        setStatus("Signed in! Redirecting...");
        router.replace("/market");
      } catch (err) {
        console.error("OAuth callback failed", err);
        setStatus("Failed to complete OAuth sign-in.");
      }
    };

    finish();
  }, [router, secret, userId]);

  if (!userId || !secret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <p className="text-foreground">Missing OAuth parameters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <p className="text-foreground">{status}</p>
      </div>
    </div>
  );
}
