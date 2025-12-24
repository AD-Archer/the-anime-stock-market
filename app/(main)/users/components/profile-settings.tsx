"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getUserAvatarUrl, getUserInitials } from "@/lib/avatar";
import type { Stock, User } from "@/lib/types";
import { MessageCircle, LogIn } from "lucide-react";

type ProfileSettingsProps = {
  authUser: { id: string; name?: string | null; email: string } | null;
  storeUser: User | null;
  authLoading: boolean;
  stocks: Stock[];
  onUpdateName: (name: string) => Promise<void>;
  onUpdatePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  onUpdatePreferences: (
    key:
      | "showSpoilers"
      | "showNsfw"
      | "isPortfolioPublic"
      | "hideTransactions"
      | "anonymousTransactions",
    value: boolean
  ) => Promise<void>;
  onUpdateAvatar: (avatarUrl: string | null) => Promise<void>;
  onExportData: () => void;
  onDeleteAccount: () => Promise<void>;
};

export function ProfileSettings({
  authUser,
  storeUser,
  authLoading,
  stocks,
  onUpdateName,
  onUpdatePassword,
  onUpdatePreferences,
  onUpdateAvatar,
  onExportData,
  onDeleteAccount,
}: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(authUser?.name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [showSpoilersPreference, setShowSpoilersPreference] = useState(true);
  const [showNsfwPreference, setShowNsfwPreference] = useState(true);
  const [portfolioPublicPreference, setPortfolioPublicPreference] =
    useState(false);
  const [hideTransactionsPreference, setHideTransactionsPreference] =
    useState(false);
  const [anonymousTransactionsPreference, setAnonymousTransactionsPreference] =
    useState(false);
  const [avatarSearch, setAvatarSearch] = useState("");
  const [avatarUpdating, setAvatarUpdating] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [preferenceLoading, setPreferenceLoading] = useState<
    null | "spoilers" | "nsfw" | "portfolio" | "transactions"
  >(null);
  const { signInWithGoogle } = useAuth();

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

  const matchingCharacters = useMemo(() => {
    const query = avatarSearch.trim().toLowerCase();
    if (!query) return [];
    return stocks
      .filter((stock) => stock.characterName.toLowerCase().includes(query))
      .slice(0, 6);
  }, [avatarSearch, stocks]);

  const handleAvatarSelect = async (avatarUrl: string | null) => {
    if (avatarUpdating) return;
    setAvatarUpdating(true);
    try {
      await onUpdateAvatar(avatarUrl);
    } finally {
      setAvatarUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!storeUser) return;
    const confirmed = window.confirm(
      "Are you sure? This schedules your account for deletion in 7 days."
    );
    if (!confirmed) return;

    setDeleteStatus(null);
    try {
      await onDeleteAccount();
      setDeleteStatus(
        "Account deletion scheduled. You'll be removed in 7 days."
      );
    } catch (error) {
      console.error("Failed to schedule deletion:", error);
      setDeleteStatus("Failed to schedule deletion. Please try again.");
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
      setPasswordError(
        "Failed to update password. Check your current password."
      );
    }
  };

  const handlePreferenceChange = async (
    key:
      | "showSpoilers"
      | "showNsfw"
      | "isPortfolioPublic"
      | "hideTransactions"
      | "anonymousTransactions",
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
        <label className="text-sm font-medium">Profile Picture</label>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={getUserAvatarUrl(storeUser)}
              alt={storeUser.username}
            />
            <AvatarFallback>
              {getUserInitials(storeUser.username)}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleAvatarSelect(null)}
            disabled={!storeUser.avatarUrl || avatarUpdating}
          >
            Reset to Default
          </Button>
        </div>
        <Input
          placeholder="Search characters (e.g., Goku)"
          value={avatarSearch}
          onChange={(e) => setAvatarSearch(e.target.value)}
        />
        {avatarSearch.trim().length > 0 && (
          <>
            {matchingCharacters.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No character matches yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {matchingCharacters.map((stock) => (
                  <button
                    key={stock.id}
                    type="button"
                    onClick={() => handleAvatarSelect(stock.imageUrl)}
                    disabled={avatarUpdating}
                    className="flex items-center gap-2 rounded-md border border-border p-2 text-left text-xs hover:bg-muted"
                  >
                    <Image
                      src={stock.imageUrl || "/placeholder.svg"}
                      alt={stock.characterName}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded object-cover"
                    />
                    <span className="font-medium">{stock.characterName}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
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
          {passwordError && (
            <p className="text-sm text-red-500">{passwordError}</p>
          )}
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
                Make your transactions appear anonymous on leaderboards and
                public views.
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
        <label className="text-sm font-medium">Linked Accounts</label>
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <h3 className="text-sm font-medium">Google</h3>
            <p className="text-xs text-muted-foreground">
              Link your Google account for one-click sign in.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!storeUser) return;
              const origin = window.location.origin;
              await signInWithGoogle({
                successUrl: `${origin}/users/${storeUser.username}?linked=google`,
                failureUrl: `${origin}/users/${storeUser.username}?oauth=failed`,
              });
            }}
          >
            <LogIn className="mr-2 h-4 w-4" /> Link Google
          </Button>
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
              Your direct messages are stored securely and can be accessed from
              the Messages page.
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
      <div className="space-y-3 border-t border-border pt-4">
        <label className="text-sm font-medium">Account Data</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-foreground">Export your data</p>
            <p className="text-xs text-muted-foreground">
              Download a JSON export of your profile, trades, comments, and
              messages.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onExportData}>
            Export Data
          </Button>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-foreground">Delete account</p>
          <p className="text-xs text-muted-foreground">
            This schedules your account for deletion. You can contact support if
            you need to cancel.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="mt-3"
            onClick={handleDeleteAccount}
          >
            Delete Account
          </Button>
          {deleteStatus && (
            <p className="mt-2 text-xs text-muted-foreground">{deleteStatus}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">Private</Badge>
        Profile settings are only visible to you.
      </div>
    </div>
  );
}
