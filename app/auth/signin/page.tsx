"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ID, OAuthProvider } from "appwrite";
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
import { useAuth } from "@/lib/auth";
import { account } from "@/lib/appwrite";

export default function SignInPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicStatus, setMagicStatus] = useState<string | null>(null);
  const [otpStatus, setOtpStatus] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpUserId, setOtpUserId] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const logDebug = (message: string) =>
    setDebugLog((prev) => [...prev, `${new Date().toISOString()}: ${message}`]);

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

  const sendMagicLink = async () => {
    setMagicStatus(null);
    if (!isValidEmail(trimmedEmail)) {
      setMagicStatus("Enter a valid email above first.");
      return;
    }
    try {
      const redirectUrl = `${window.location.origin}/auth/magic/confirm`;
      await account.createMagicURLToken(ID.unique(), trimmedEmail, redirectUrl);
      setMagicStatus("Magic link sent! Check your email.");
    } catch (err) {
      console.error("Magic link failed", err);
      setMagicStatus(toFriendlyAuthError(err));
    }
  };

  const sendEmailOtp = async () => {
    setOtpStatus(null);
    if (!isValidEmail(trimmedEmail)) {
      setOtpStatus("Enter a valid email above first.");
      return;
    }
    try {
      const token = await account.createEmailToken(ID.unique(), trimmedEmail);
      setOtpUserId(token.userId);
      setOtpStatus("Code sent! Check your email and enter it below.");
    } catch (err) {
      console.error("OTP send failed", err);
      setOtpStatus(toFriendlyAuthError(err));
    }
  };

  const verifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpUserId || !otpCode) {
      setOtpStatus("Enter the code you received.");
      return;
    }
    try {
      await account.createSession(otpUserId, otpCode.trim());
      router.push("/market");
    } catch (err) {
      console.error("OTP login failed", err);
      setOtpStatus("Invalid code. Try again.");
    }
  };

  const handleGoogle = async () => {
    const origin = window.location.origin;
    const success = `${origin}/auth/oauth/callback`;
    const failure = `${origin}/auth/signin?oauth=failed`;
    logDebug(`Starting Google OAuth via Appwrite; success=${success}`);
    try {
      await account.createOAuth2Session(OAuthProvider.Google, success, failure);
    } catch (err: any) {
      console.error("Google OAuth start failed", err);
      logDebug(
        `OAuth launch failed: ${
          err?.message || "unknown error"
        } (check Appwrite platform redirect URLs)`
      );
      setError(
        "Failed to start Google sign-in. Check redirects and try again."
      );
    }
  };

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl grid gap-6 md:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="space-y-4">
          <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="mr-1 h-4 w-4" /> Secure Appwrite Auth
          </p>
          <h1 className="text-4xl font-bold text-foreground leading-tight">
            Welcome back to Anime Stock Exchange
          </h1>
          <p className="text-muted-foreground text-lg">
            Sign in with email/password or use a one-click method. Your data is
            stored securely in Appwrite.
          </p>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <KeyRound className="h-4 w-4" /> Email OTP
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail className="h-4 w-4" /> Magic link
            </span>
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
              Use your email/password or a passwordless option.
            </p>
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
              <Label htmlFor="password">Password</Label>
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
            >
              Continue with Google
            </Button>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Label>Email magic link</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={sendMagicLink}
                  disabled={!isValidEmail(trimmedEmail)}
                >
                  Send link
                </Button>
              </div>
              {magicStatus && (
                <p className="text-xs text-muted-foreground">{magicStatus}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Label>Email one-time code</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={sendEmailOtp}
                  disabled={!isValidEmail(trimmedEmail)}
                >
                  Send code
                </Button>
              </div>
              <form
                onSubmit={verifyEmailOtp}
                className="flex gap-2 items-center"
              >
                <Input
                  type="text"
                  placeholder="Enter code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
                <Button type="submit">Verify</Button>
              </form>
              {otpStatus && (
                <p className="text-xs text-muted-foreground">{otpStatus}</p>
              )}
            </div>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            No account yet?{" "}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>

          {debugLog.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
                <ShieldCheck className="h-4 w-4" />
                OAuth Debug
              </div>
              <div className="space-y-1 text-xs font-mono text-muted-foreground max-h-28 overflow-y-auto">
                {debugLog.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
