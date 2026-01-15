"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { account, ensureAppwriteInitialized } from "@/lib/appwrite/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

export default function PasswordResetRequestPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await ensureAppwriteInitialized();
      const redirect = `${window.location.origin}/auth/reset/callback`;
      await account.createRecovery({ email: trimmedEmail, url: redirect });
      setSent(true);
      setMessage(
        "If an account with that email exists, you will receive a reset link shortly. Please check your inbox and spam folder."
      );
    } catch (err: any) {
      console.warn("Failed to request password recovery:", err);
      const raw =
        err?.message || "Failed to request password reset. Please try again.";

      // Handle specific error cases
      if (/redirect|platform|url/i.test(raw)) {
        setError(
          `${raw} — Make sure /auth/reset/callback is added as an allowed redirect URL in Appwrite Console.`
        );
      } else if (/rate limit/i.test(raw)) {
        setError(
          "Too many requests. Please wait a few minutes before trying again."
        );
      } else {
        // Don't reveal if email exists or not for security
        setSent(true);
        setMessage(
          "If an account with that email exists, you will receive a reset link shortly. Please check your inbox and spam folder."
        );
      }
    } finally {
      setLoading(false);
    }
  };

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
              Reset Password
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your email address and we&apos;ll send you a link to reset
              your password.
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {message}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSent(false);
                    setMessage(null);
                    setEmail("");
                  }}
                >
                  Send another link
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push("/auth/signin")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to sign in
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending link...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => router.push("/auth/signin")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to sign in
              </Button>
            </form>
          )}
        </div>

        {/* Additional help text */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
