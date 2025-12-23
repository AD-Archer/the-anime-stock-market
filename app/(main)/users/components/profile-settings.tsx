"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/types";
import { account } from "@/lib/appwrite/appwrite";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

type ProfileSettingsProps = {
  authUser: { id: string; name?: string | null; email: string } | null;
  storeUser: User | null;
  authLoading: boolean;
  onUpdateName: (name: string) => Promise<void>;
  onUpdatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onUpdatePreferences: (
    key: "showSpoilers" | "showNsfw" | "isPortfolioPublic" | "hideTransactions" | "anonymousTransactions",
    value: boolean
  ) => Promise<void>;
};

export function ProfileSettings({
  authUser,
  storeUser,
  authLoading,
  onUpdateName,
  onUpdatePassword,
  onUpdatePreferences,
}: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(authUser?.name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [jwt, setJwt] = useState<string | null>(null);
  const [jwtStatus, setJwtStatus] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [showSpoilersPreference, setShowSpoilersPreference] = useState(true);
  const [showNsfwPreference, setShowNsfwPreference] = useState(true);
  const [portfolioPublicPreference, setPortfolioPublicPreference] = useState(false);
  const [hideTransactionsPreference, setHideTransactionsPreference] = useState(false);
  const [anonymousTransactionsPreference, setAnonymousTransactionsPreference] = useState(false);
  const [preferenceLoading, setPreferenceLoading] = useState<
    null | "spoilers" | "nsfw" | "portfolio" | "transactions"
  >(null);

  useEffect(() => {
    if (authUser) {
      setDisplayName(authUser.name || authUser.email);
    }
  }, [authUser]);

  useEffect(() => {
    if (storeUser) {
      setShowSpoilersPreference(storeUser.showSpoilers);
      setShowNsfwPreference(storeUser.showNsfw);
      setPortfolioPublicPreference(storeUser.isPortfolioPublic);
      setHideTransactionsPreference(storeUser.hideTransactions);
      setAnonymousTransactionsPreference(storeUser.anonymousTransactions);
    }
  }, [storeUser]);

  const fetchJwt = async () => {
    setJwtStatus(null);
    try {
      const token = await account.createJWT();
      setJwt(token.jwt);
      setJwtStatus("JWT generated (valid 15 minutes).");
    } catch (err) {
      console.error("Failed to create JWT", err);
      setJwtStatus("Failed to create JWT. Are you signed in?");
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    try {
      await onUpdatePassword(currentPassword, newPassword);
      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Failed to update password", err);
      setPasswordError("Failed to update password. Check your current password.");
    }
  };

  const handlePreferenceChange = async (
    key: "showSpoilers" | "showNsfw" | "isPortfolioPublic" | "hideTransactions" | "anonymousTransactions",
    value: boolean
  ) => {
    const loadingKey =
      key === "showSpoilers"
        ? "spoilers"
        : key === "showNsfw"
        ? "nsfw"
        : key === "isPortfolioPublic"
        ? "portfolio"
        : "transactions";
    setPreferenceLoading(loadingKey);
    try {
      await onUpdatePreferences(key, value);
    } catch (error) {
      console.error("Failed to update content preference", error);
      if (key === "showSpoilers") {
        setShowSpoilersPreference((prev) => !prev);
      } else if (key === "showNsfw") {
        setShowNsfwPreference((prev) => !prev);
      } else if (key === "isPortfolioPublic") {
        setPortfolioPublicPreference((prev) => !prev);
      } else if (key === "hideTransactions") {
        setHideTransactionsPreference((prev) => !prev);
      } else if (key === "anonymousTransactions") {
        setAnonymousTransactionsPreference((prev) => !prev);
      }
    } finally {
      setPreferenceLoading(null);
    }
  };

  if (authLoading || !authUser || !storeUser) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Display Name</label>
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={async (e) => {
                  const newName = e.target.value.trim();
                  if (newName && newName !== authUser.name) {
                    await onUpdateName(newName);
                    setDisplayName(newName);
                  } else if (!newName) {
                    setDisplayName(authUser.name || "");
                  }
                  setIsEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    setDisplayName(authUser.name || "");
                    setIsEditingName(false);
                  }
                }}
                className="flex-1 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter your display name"
                autoFocus
              />
              <button
                onClick={() => {
                  setDisplayName(authUser.name || "");
                  setIsEditingName(false);
                }}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 py-2 text-foreground">
                {authUser.name || "No display name set"}
              </span>
              <button
                onClick={() => setIsEditingName(true)}
                className="px-3 py-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Change Password</label>
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button onClick={handlePasswordChange} size="sm">
            Update Password
          </Button>
          {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
          {passwordSuccess && (
            <p className="text-sm text-green-500">{passwordSuccess}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <p className="text-sm text-muted-foreground">{authUser.email}</p>
        <p className="text-xs text-muted-foreground">
          Email cannot be changed here. Contact support if needed.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Account Security</label>
        <p className="text-sm text-muted-foreground">
          Your account is secured with Appwrite authentication.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">JWT (15 min)</label>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchJwt}>
            Generate JWT
          </Button>
          {jwtStatus && (
            <span className="text-xs text-muted-foreground">{jwtStatus}</span>
          )}
        </div>
        {jwt && (
          <p className="text-xs break-all rounded bg-muted p-2 font-mono">{jwt}</p>
        )}
      </div>
      <div className="space-y-3 border-t border-border pt-4">
        <label className="text-sm font-medium">Content Preferences</label>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-foreground">Show Spoilers</p>
              <p className="text-xs text-muted-foreground">
                Hide comments tagged as spoilers when disabled.
              </p>
            </div>
            <input
              type="checkbox"
              checked={showSpoilersPreference}
              onChange={(e) => {
                const value = e.target.checked;
                setShowSpoilersPreference(value);
                handlePreferenceChange("showSpoilers", value);
              }}
              disabled={preferenceLoading === "spoilers"}
              className="h-4 w-4 accent-primary"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-foreground">Show NSFW</p>
              <p className="text-xs text-muted-foreground">
                Blur or collapse NSFW-tagged comments when disabled.
              </p>
            </div>
            <input
              type="checkbox"
              checked={showNsfwPreference}
              onChange={(e) => {
                const value = e.target.checked;
                setShowNsfwPreference(value);
                handlePreferenceChange("showNsfw", value);
              }}
              disabled={preferenceLoading === "nsfw"}
              className="h-4 w-4 accent-primary"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-foreground">Public Portfolio</p>
              <p className="text-xs text-muted-foreground">
                Allow other users to view your holdings on your public profile.
              </p>
            </div>
            <input
              type="checkbox"
              checked={portfolioPublicPreference}
              onChange={(e) => {
                const value = e.target.checked;
                setPortfolioPublicPreference(value);
                handlePreferenceChange("isPortfolioPublic", value);
              }}
              disabled={preferenceLoading === "portfolio"}
              className="h-4 w-4 accent-primary"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-foreground">Hide Transactions</p>
              <p className="text-xs text-muted-foreground">
                Hide your transaction history from your public profile.
              </p>
            </div>
            <input
              type="checkbox"
              checked={hideTransactionsPreference}
              onChange={(e) => {
                const value = e.target.checked;
                setHideTransactionsPreference(value);
                handlePreferenceChange("hideTransactions", value);
              }}
              disabled={preferenceLoading === "transactions"}
              className="h-4 w-4 accent-primary"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-foreground">Anonymous Transactions</p>
              <p className="text-xs text-muted-foreground">
                Make your transactions appear anonymous on leaderboards and public views.
              </p>
            </div>
            <input
              type="checkbox"
              checked={anonymousTransactionsPreference}
              onChange={(e) => {
                const value = e.target.checked;
                setAnonymousTransactionsPreference(value);
                handlePreferenceChange("anonymousTransactions", value);
              }}
              disabled={preferenceLoading === "transactions"}
              className="h-4 w-4 accent-primary"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <label className="text-sm font-medium">Messaging Settings</label>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <h3 className="text-sm font-medium">Direct Messages</h3>
              <p className="text-xs text-muted-foreground">
                Allow other users to send you direct messages
              </p>
            </div>
            <input
              type="checkbox"
              checked={true}
              disabled={true}
              className="h-4 w-4 accent-primary"
              title="Direct messaging is currently always enabled"
            />
          </div>

          <div className="p-4 border border-border rounded-lg">
            <h3 className="text-sm font-medium mb-2">Privacy</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Control how you appear to others when messaging.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Show online status</p>
                  <p className="text-xs text-muted-foreground">
                    Let others see when you&apos;re active
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={false}
                  disabled={true}
                  className="h-4 w-4 accent-primary"
                  title="Coming soon"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Allow message requests</p>
                  <p className="text-xs text-muted-foreground">
                    Allow users to start conversations with you
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled={true}
                  className="h-4 w-4 accent-primary"
                  title="Currently enabled for all users"
                />
              </div>
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <h3 className="text-sm font-medium mb-2">Message History</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Your direct messages are stored securely and can be accessed from the Messages page.
            </p>
            <Link href="/messages">
              <Button variant="outline" size="sm">
                <MessageCircle className="mr-2 h-4 w-4" />
                View Messages
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">Private</Badge>
        Profile settings are only visible to you.
      </div>
    </div>
  );
}
