"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { account, ensureAppwriteInitialized } from "@/lib/appwrite/appwrite";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Lock,
  KeyRound,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

// Password strength indicator
function PasswordStrengthMeter({ password }: { password: string }) {
  const getStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(password);
  const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
  ];

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < strength ? colors[strength - 1] : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength: {labels[strength - 1] || "Too short"}
      </p>
    </div>
  );
}

// Password requirements component
function PasswordRequirements({ password }: { password: string }) {
  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    {
      label: "Contains uppercase & lowercase",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
  ];

  if (!password) return null;

  return (
    <div className="space-y-1 mt-2">
      {requirements.map((req, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          {req.met ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <XCircle className="h-3 w-3 text-muted-foreground" />
          )}
          <span
            className={req.met ? "text-green-500" : "text-muted-foreground"}
          >
            {req.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PasswordResetCallbackPage() {
  const search = useSearchParams();
  const router = useRouter();
  const userId = search.get("userId");
  const secret = search.get("secret");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!userId || !secret) {
      setError("Invalid or expired reset link. Please request a new one.");
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
      await account.updateRecovery({ userId, secret, password });
      setSuccess(true);
    } catch (err: any) {
      console.warn("Failed to complete password reset:", err);
      const raw = err?.message || "Failed to reset password. Please try again.";

      if (/expired/i.test(raw)) {
        setError(
          "This reset link has expired. Please request a new password reset."
        );
      } else if (/redirect|platform|url/i.test(raw)) {
        setError(
          `${raw} — Ensure the password reset redirect URL is added as a platform in Appwrite Console.`
        );
      } else if (/invalid/i.test(raw)) {
        setError("Invalid reset link. Please request a new password reset.");
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show invalid link state
  if (!userId || !secret) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl shadow-lg p-6 space-y-6 text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                Invalid Reset Link
              </h2>
              <p className="text-sm text-muted-foreground">
                This password reset link is invalid or has expired. Please
                request a new one.
              </p>
            </div>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => router.push("/auth/reset")}
              >
                Request new reset link
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => router.push("/auth/signin")}
              >
                Back to sign in
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl shadow-lg p-6 space-y-6 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-green-600 dark:text-green-400">
                Password Updated!
              </h2>
              <p className="text-sm text-muted-foreground">
                Your password has been successfully reset. You can now sign in
                with your new password.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => router.push("/auth/signin")}
            >
              Sign in now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              Set New Password
            </h2>
            <p className="text-sm text-muted-foreground">
              Create a strong password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <PasswordStrengthMeter password={password} />
              <PasswordRequirements password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {password && confirm && password !== confirm && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Passwords do not match
                </p>
              )}
              {password &&
                confirm &&
                password === confirm &&
                confirm.length >= 8 && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || password.length < 8 || password !== confirm}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating password...
                </>
              ) : (
                "Update password"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/auth/signin")}
            >
              Cancel
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
