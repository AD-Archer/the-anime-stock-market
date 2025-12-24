"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ID } from "appwrite";
import {
  LogIn,
  Mail,
  Lock,
  ShieldCheck,
  KeyRound,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { account } from "@/lib/appwrite/appwrite";

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading, signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Email OTP removed; using email/password + Google OAuth
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/market");
    }
  }, [user, authLoading, router]);

  const trimmedEmail = email.trim();
  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const toFriendlyAuthError = (err: unknown) => {
    const message =
      (err as any)?.message || (err as any)?.response?.message || String(err);
    if (
      typeof message === "string" &&
      message.includes("Invalid `email` param")
    ) {
      return "Enter a valid email address.";
    }
    if (
      typeof message === "string" &&
      (message.includes("Invalid credentials") ||
        message.includes("Invalid token") ||
        message.includes("Invalid password"))
    ) {
      return "Invalid credentials. Please check the email and password.";
    }
    return "Invalid credentials or network error. Please try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!termsAccepted || !privacyAccepted) {
      setError(
        "Please accept the Terms of Service and Privacy Policy to continue."
      );
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await signIn(trimmedEmail, password);
      router.push("/market");
    } catch (err) {
      console.error("Sign in failed", err);
      setError(toFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Magic Link flow removed
  // Email OTP flow removed

  const handleGoogle = async () => {
    setError(null);
    if (!termsAccepted || !privacyAccepted) {
      setError(
        "Please accept the Terms of Service and Privacy Policy to continue."
      );
      return;
    }
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Google OAuth start failed", err);
      setError(
        "Failed to start Google sign-in. Check redirects and try again."
      );
    }
  };

  useEffect(() => {
    if (params.get("oauth") === "failed") {
      setError("Google sign-in failed. Try again or use a different provider.");
    }
  }, [params]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl grid gap-6 md:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="space-y-4">
          <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="mr-1 h-4 w-4" /> Secure Appwrite Auth
          </p>
          <h1 className="texxl font-bold text-foreground leading-tight">
            Welcome back to Anime Stock Exchange
          </h1>
          <p className="text-muted-foreground text-lg">
            Sign in with email/password or Google OAuth. Powered by Appwrite.
          </p>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <LogIn className="h-4 w-4" /> Google OAuth
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-lg p-6 space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-semibold text-foreground flex items-center justify-center gap-2">
              <LogIn className="h-5 w-5" />
              Sign in
            </h2>
            <p className="text-sm text-muted-foreground">
              Use email/password or Google OAuth.
            </p>
          </div>

          {/* Notice to accept both Terms and Privacy */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30 p-3">
            <p className="text-xs text-blue-900 dark:text-blue-200">
              <strong>Please accept Terms of Service AND Privacy Policy</strong>{" "}
              before signing in.
            </p>
          </div>

          {/* Google sign-in at the top with Google icon */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
          >
            <GoogleIcon className="mr-2 h-4 w-4" /> Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
            
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  id="tos-accept-signin"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <label htmlFor="tos-accept-signin">
                  I have read and agree to the most recent {""}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>
                </label>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  id="privacy-accept-signin"
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <label htmlFor="privacy-accept-signin">
                  I have read and agree to the most recent {""}
                  <Link
                    href="/privacy"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !termsAccepted || !privacyAccepted}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            No account yet? {""}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        fill="#FFC107"
        d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.3 6.8 29.4 5 24 5a19 19 0 1 0 0 38c9.7 0 17.7-6.9 19.3-16.1l.3-6.4z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.6l6.6 4.8C15 16 19.2 13 24 13c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.3 6.8 29.4 5 24 5c-7 0-13.2 3.4-17 8.6z"
      />
      <path
        fill="#4CAF50"
        d="M24 43c5.6 0 10.4-2.1 14.1-5.5l-6.5-5.3c-2 1.5-4.6 2.4-7.6 2.4a12 12 0 0 1-11.3-8l-6.6 5.1C6 37.9 14.3 43 24 43z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5h-1.9V20H24v8h11.3a12 12 0 0 1-4.1 5.3l6.5 5.3C39.4 35.7 43 30.6 43.6 24l.3-3.5z"
      />
    </svg>
  );
}
