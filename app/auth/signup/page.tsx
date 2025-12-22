"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OAuthProvider } from "appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { account } from "@/lib/appwrite";
import { UserPlus, Mail, Lock, IdCard, Loader2 } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    const origin = window.location.origin;
    const success = `${origin}/auth/oauth/callback`;
    const failure = `${origin}/auth/signup?oauth=failed`;
    setError(null);
    try {
      await account.createOAuth2Session(OAuthProvider.Google, success, failure);
    } catch (err) {
      console.error("Google OAuth start failed", err);
      setError(
        "Failed to start Google sign-up. Check redirects and try again."
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signUp(name.trim() || email.split("@")[0], email.trim(), password);
      router.push("/market");
    } catch (err) {
      console.error("Sign up failed", err);
      setError("Could not create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl grid gap-6 md:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="space-y-4">
          <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <UserPlus className="mr-1 h-4 w-4" /> Create your portfolio
          </p>
          <h1 className="text-4xl font-bold text-foreground leading-tight">
            Join the Anime Stock Exchange
          </h1>
          <p className="text-muted-foreground text-lg">
            Build your account in seconds with Appwrite auth. Trade, manage
            portfolios, and track your favorite characters.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-lg p-6 space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-semibold text-foreground flex items-center justify-center gap-2">
              <UserPlus className="h-5 w-5" />
              Sign up
            </h2>
            <p className="text-sm text-muted-foreground">
              Create an account with your email and password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Luffy Trader"
                  className="pl-10"
                />
              </div>
            </div>
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating
                  account...
                </span>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
          >
            Continue with Google
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
