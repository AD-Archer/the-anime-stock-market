"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { account, ensureAppwriteInitialized } from "@/lib/appwrite/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PasswordResetRequestPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await ensureAppwriteInitialized();
      const redirect = `${window.location.origin}/auth/reset/callback`;
      // Appwrite expects an object { email, url }
      await account.createRecovery({ email, url: redirect });
      setMessage(
        "If an account with that email exists, you will receive a reset link shortly."
      );
    } catch (err: any) {
      console.warn("Failed to request password recovery:", err);
      const raw =
        err?.message || "Failed to request password reset. Please try again.";
      const friendly = /redirect|platform|url/i.test(raw)
        ? `${raw} — Make sure /auth/reset/callback is added as an allowed redirect URL in Appwrite Console.`
        : raw;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm max-w-md w-full">
        <h2 className="text-lg font-semibold text-foreground">
          Reset Password
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Enter your email to receive a password reset link.
        </p>
        <div className="mt-4 space-y-2">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          {message && <p className="text-sm text-green-500">{message}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/auth/signin")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
