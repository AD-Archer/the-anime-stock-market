"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { account, ensureAppwriteInitialized } from "@/lib/appwrite/appwrite";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function PasswordResetCallbackPage() {
  const search = useSearchParams();
  const router = useRouter();
  const userId = search.get("userId");
  const secret = search.get("secret");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!userId || !secret) {
      setError("Missing reset parameters.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await ensureAppwriteInitialized();
      // Appwrite expects an object with userId, secret and password
      await account.updateRecovery({ userId, secret, password });
      setSuccess("Password updated. You can now sign in.");
      setTimeout(() => router.push("/auth/signin"), 1500);
    } catch (err: any) {
      console.warn("Failed to complete password reset:", err);
      const raw = err?.message || "Failed to reset password. Please try again.";
      const friendly = /redirect|platform|url/i.test(raw)
        ? `${raw} — ensure the password reset redirect URL is added as a platform in Appwrite Console.`
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
          Set New Password
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Create a new password for your account.
        </p>
        <div className="mt-4 space-y-2">
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-500">{success}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Updating…" : "Update password"}
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
