"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getUserAvatarUrl, getUserInitials } from "@/lib/avatar";
import { generateDisplaySlug } from "@/lib/usernames";
import type { Stock, User } from "@/lib/types";
import { MessageCircle, LogIn, LogOut, CheckCircle2 } from "lucide-react";

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
  onUpdateNotificationPreferences: (preferences: {
    emailNotificationsEnabled?: boolean;
    directMessageEmailNotifications?: boolean;
  }) => Promise<void>;
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
  onUpdateNotificationPreferences,
  onUpdateAvatar,
  onExportData,
  onDeleteAccount,
}: ProfileSettingsProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(storeUser?.displayName || "");
  const [displaySlug, setDisplaySlug] = useState(storeUser?.displaySlug || "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isCreatingPassword, setIsCreatingPassword] = useState(false);
  const [createPasswordNew, setCreatePasswordNew] = useState("");
  const [createPasswordConfirm, setCreatePasswordConfirm] = useState("");
  const [showSpoilersPreference, setShowSpoilersPreference] = useState(true);
  const [showNsfwPreference, setShowNsfwPreference] = useState(true);
  const [portfolioPublicPreference, setPortfolioPublicPreference] =
    useState(false);
  const [hideTransactionsPreference, setHideTransactionsPreference] =
    useState(false);
  const [anonymousTransactionsPreference, setAnonymousTransactionsPreference] =
    useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] =
    useState(false);
  const [directMessageEmailNotifications, setDirectMessageEmailNotifications] =
    useState(false);
  const [avatarSearch, setAvatarSearch] = useState("");
  const [avatarUpdating, setAvatarUpdating] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [preferenceLoading, setPreferenceLoading] = useState<
    null | "spoilers" | "nsfw" | "portfolio" | "transactions"
  >(null);
  const [notificationPreferenceLoading, setNotificationPreferenceLoading] =
    useState<null | "email" | "direct">(null);
  const {
    signInWithGoogle,
    getLinkedProviders,
    unlinkProvider,
    createPassword,
    hasPassword,
  } = useAuth();
  const isOwnProfile = Boolean(
    authUser && storeUser && authUser.id === storeUser.id
  );
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [linkStatus, setLinkStatus] = useState<string | null>(null);
  const [userHasPassword, setUserHasPassword] = useState(true);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (storeUser) {
      setDisplayName(storeUser.displayName || "");
      setDisplaySlug(storeUser.displaySlug || "");
    }
  }, [storeUser]);

  // Check if user has a password
  useEffect(() => {
    const checkPassword = async () => {
      try {
        const hasPwd = await hasPassword();
        console.log("[ProfileSettings] hasPassword() returned:", hasPwd);
        setUserHasPassword(hasPwd);
      } catch (error) {
        console.error("Failed to check password status:", error);
        setUserHasPassword(false); // Default to false to show create password option
      }
    };
    if (authUser) {
      checkPassword();
    }
  }, [authUser, hasPassword]);

  // When entering edit mode, focus the input, move caret to the end and
  // smoothly scroll the input (or the container) into view. Non-blocking.
  useEffect(() => {
    if (!isEditingProfile) return;

    // Focus and set caret to end when input is available
    if (nameInputRef.current) {
      const el = nameInputRef.current;
      // Focus first to ensure keyboard appears on mobile
      el.focus();
      const len = el.value ? el.value.length : 0;
      try {
        el.setSelectionRange(len, len);
      } catch (e) {
        // ignore - fallback behavior is fine
      }

      // Smoothly scroll input into view without blocking
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e) {
        // ignore scroll errors
      }
      return;
    }

    // If input not yet mounted, fall back to scrolling the container
    if (containerRef.current) {
      try {
        containerRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } catch (e) {
        // ignore
      }
    }
  }, [isEditingProfile]);

  useEffect(() => {
    if (storeUser) {
      setShowSpoilersPreference(storeUser.showSpoilers);
      setShowNsfwPreference(storeUser.showNsfw);
      setPortfolioPublicPreference(storeUser.isPortfolioPublic);
      setHideTransactionsPreference(storeUser.hideTransactions);
      setAnonymousTransactionsPreference(storeUser.anonymousTransactions);
      setEmailNotificationsEnabled(!!storeUser.emailNotificationsEnabled);
      setDirectMessageEmailNotifications(
        !!storeUser.directMessageEmailNotifications
      );
    }
  }, [storeUser]);

  // Load linked providers
  useEffect(() => {
    const loadProviders = async () => {
      if (!authUser) return;
      setLoadingProviders(true);
      try {
        const providers = await getLinkedProviders();
        setLinkedProviders(providers);
      } catch (error) {
        console.error("Failed to load linked providers:", error);
      } finally {
        setLoadingProviders(false);
      }
    };
    loadProviders();
  }, [authUser, getLinkedProviders]);

  // Check for link success message
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("linked") === "google") {
        setLinkStatus("Google account linked successfully!");
        // Remove the param from URL
        params.delete("linked");
        const newUrl = `${window.location.pathname}${
          params.toString() ? `?${params.toString()}` : ""
        }`;
        window.history.replaceState({}, "", newUrl);
        // Refresh providers
        getLinkedProviders().then(setLinkedProviders);
        // Clear message after 5 seconds
        setTimeout(() => setLinkStatus(null), 5000);
      }
    }
  }, [getLinkedProviders]);

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

  const handleSaveProfileChanges = async () => {
    setProfileError(null);
    setProfileSuccess(null);
    setProfileSaving(true);

    try {
      const newDisplayName = displayName.trim();
      if (!newDisplayName) {
        setProfileError("Display name cannot be empty.");
        setProfileSaving(false);
        return;
      }

      // Update display name in the database
      await onUpdateName(newDisplayName);
      setProfileSuccess("Profile updated successfully!");
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccess(null), 3000);

      // Generate the new slug from the new display name
      const newSlug = generateDisplaySlug(newDisplayName, [
        storeUser?.displaySlug || "",
      ]);
      setDisplaySlug(newSlug);

      // Redirect to the new profile page with the newly generated slug after a short delay
      setTimeout(() => {
        router.push(`/users/${newSlug}`);
      }, 500);
    } catch (error) {
      console.error("Failed to save profile", error);
      setProfileError("Failed to save profile. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCreatePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!createPasswordNew || !createPasswordConfirm) {
      setPasswordError("Both fields are required.");
      return;
    }

    if (createPasswordNew !== createPasswordConfirm) {
      setPasswordError("Passwords do not match.");
      return;
    }

    if (createPasswordNew.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    try {
      // Re-check server-side flag in case it changed since mount
      const already = await hasPassword();
      if (already) {
        setPasswordError(
          "It looks like you already have a password. Use 'Change Password' instead."
        );
        setIsCreatingPassword(false);
        return;
      }

      await createPassword(createPasswordNew);
      setPasswordSuccess(
        "Password created successfully! You can now sign in with your email and password."
      );
      setCreatePasswordNew("");
      setCreatePasswordConfirm("");
      setIsCreatingPassword(false);
      setUserHasPassword(true);
    } catch (error: any) {
      // Show user-friendly message from the provider if present; avoid noisy stack traces
      const message =
        error?.message || "Failed to create password. Please try again.";
      console.warn("Create password error:", message);
      setPasswordError(message);
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
      if (!userHasPassword) {
        setPasswordError(
          "It looks like you don't have a password set yet. Use the 'Create Password' option below first."
        );
      } else {
        setPasswordError(
          "Failed to update password. Check your current password."
        );
      }
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

  const handleEmailNotificationToggle = async (value: boolean) => {
    if (!isOwnProfile) return;
    setEmailNotificationsEnabled(value);
    setNotificationPreferenceLoading("email");
    try {
      await onUpdateNotificationPreferences({
        emailNotificationsEnabled: value,
      });
    } catch (error) {
      console.error("Failed to update email notifications", error);
      setEmailNotificationsEnabled((prev) => !value);
    } finally {
      setNotificationPreferenceLoading(null);
    }
  };

  const handleDirectMessageEmailToggle = async (value: boolean) => {
    if (!isOwnProfile) return;
    setDirectMessageEmailNotifications(value);
    setNotificationPreferenceLoading("direct");
    try {
      await onUpdateNotificationPreferences({
        directMessageEmailNotifications: value,
      });
    } catch (error) {
      console.error("Failed to update DM email notifications", error);
      setDirectMessageEmailNotifications((prev) => !value);
    } finally {
      setNotificationPreferenceLoading(null);
    }
  };

  if (authLoading || !authUser || !storeUser) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="bg-card border border-border rounded-lg p-6 space-y-4"
    >
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Profile Name (Display Name)
        </label>
        <p className="text-xs text-muted-foreground">
          This is what other users see on your profile.
        </p>
        {isEditingProfile ? (
          <div className="space-y-2">
            <Input
              ref={nameInputRef}
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
            />
            <p className="text-xs text-muted-foreground">
              Profile slug:{" "}
              <code className="bg-muted px-2 py-1 rounded">{displaySlug}</code>
            </p>
            {profileError && (
              <p className="text-sm text-red-500">{profileError}</p>
            )}
            {profileSuccess && (
              <p className="text-sm text-green-500">{profileSuccess}</p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleSaveProfileChanges}
                disabled={profileSaving}
                size="sm"
              >
                {profileSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditingProfile(false);
                  setDisplayName(storeUser?.displayName || "");
                  setProfileError(null);
                }}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/50">
            <div>
              <p className="text-foreground font-medium">
                {displayName || "No display name set"}
              </p>
              <p className="text-xs text-muted-foreground">@{displaySlug}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingProfile(true)}
            >
              Edit
            </Button>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
        <p className="text-sm font-semibold">Premium Membership</p>
        <p className="text-xs text-muted-foreground">
          {storeUser.premiumMeta?.isPremium
            ? "Thank you for supporting the project! Manage your premium tools below."
            : "Upgrade to premium to unlock character creation, priority suggestions, and the DM board."}
        </p>
        <Button size="sm" variant="outline" asChild>
          <Link href="/premium">
            {storeUser.premiumMeta?.isPremium
              ? "Manage Premium"
              : "Learn about Premium"}
          </Link>
        </Button>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Profile Picture</label>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={getUserAvatarUrl(storeUser)}
              alt={storeUser.displayName || storeUser.username}
            />
            <AvatarFallback>
              {getUserInitials(storeUser.displayName || storeUser.username)}
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

      <div className="space-y-2 border-t border-border pt-4">
        {!userHasPassword ? (
          <>
            <label className="text-sm font-medium">Create Password</label>
            <p className="text-xs text-muted-foreground">
              You&apos;re currently signed in with Google. Create a password to
              enable traditional email/password sign in.
            </p>
            {!isCreatingPassword ? (
              <Button
                variant="outline"
                onClick={() => setIsCreatingPassword(true)}
                size="sm"
              >
                Create Password
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="New password"
                  value={createPasswordNew}
                  onChange={(e) => setCreatePasswordNew(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Confirm password"
                  value={createPasswordConfirm}
                  onChange={(e) => setCreatePasswordConfirm(e.target.value)}
                />
                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-sm text-green-500">{passwordSuccess}</p>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleCreatePassword} size="sm">
                    Create Password
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreatingPassword(false);
                      setCreatePasswordNew("");
                      setCreatePasswordConfirm("");
                      setPasswordError(null);
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
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
              <div className="flex gap-2 items-center">
                <Button onClick={handlePasswordChange} size="sm">
                  Update Password
                </Button>
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={async () => {
                    try {
                      if (!authUser?.email) return;
                      const { ensureAppwriteInitialized, account } =
                        await import("@/lib/appwrite/appwrite");
                      await ensureAppwriteInitialized();
                      await account.createRecovery({
                        email: authUser.email,
                        url: `${window.location.origin}/auth/reset/callback`,
                      });
                      setPasswordSuccess("Reset link sent to your email.");
                    } catch (err: any) {
                      console.warn("Failed to send reset email", err);
                      const raw = err?.message || "Failed to send reset link.";
                      const friendly = /redirect|platform|url/i.test(raw)
                        ? `${raw} — ensure /auth/reset/callback is added as an allowed redirect URL in Appwrite Console.`
                        : raw;
                      setPasswordError(friendly);
                    }
                  }}
                >
                  Forgot? Send reset email
                </button>
              </div>
              {passwordError && (
                <p className="text-sm text-red-500">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-green-500">{passwordSuccess}</p>
              )}
            </div>
          </>
        )}
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
        <label className="text-sm font-medium">Notification Preferences</label>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-foreground">Email notifications</p>
              <p className="text-xs text-muted-foreground">
                Receive a digest of your notifications in your inbox
                (notifications still stay in the app).
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailNotificationsEnabled}
              onChange={(e) => handleEmailNotificationToggle(e.target.checked)}
              disabled={notificationPreferenceLoading === "email"}
              className="h-4 w-4 accent-primary"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-foreground">Direct message emails</p>
              <p className="text-xs text-muted-foreground">
                Get an email whenever someone sends you a direct message.
              </p>
            </div>
            <input
              type="checkbox"
              checked={directMessageEmailNotifications}
              onChange={(e) => handleDirectMessageEmailToggle(e.target.checked)}
              disabled={notificationPreferenceLoading === "direct"}
              className="h-4 w-4 accent-primary"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <label className="text-sm font-medium">Linked Accounts</label>
        {linkStatus && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {linkStatus}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Google</h3>
              {loadingProviders ? (
                <span className="text-xs text-muted-foreground">
                  Loading...
                </span>
              ) : linkedProviders.includes("google") ? (
                <Badge variant="secondary" className="text-xs">
                  Linked
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {linkedProviders.includes("google")
                ? "Your Google account is linked for one-click sign in."
                : "Link your Google account for one-click sign in."}
            </p>
          </div>
          {loadingProviders ? (
            <Button variant="outline" size="sm" disabled>
              Loading...
            </Button>
          ) : linkedProviders.includes("google") ? (
            <Button
              variant="outline"
              size="sm"
              disabled={!userHasPassword}
              title={
                !userHasPassword
                  ? "You must create a password before unlinking Google"
                  : ""
              }
              onClick={async () => {
                if (!userHasPassword) {
                  setLinkStatus(
                    "Please create a password first before unlinking your Google account."
                  );
                  setTimeout(() => setLinkStatus(null), 5000);
                  return;
                }
                if (
                  !confirm(
                    "Are you sure you want to unlink your Google account?"
                  )
                ) {
                  return;
                }
                try {
                  // Find the Google identity ID
                  const { account } = await import("@/lib/appwrite/appwrite");
                  const identities = await account.listIdentities();
                  const googleIdentity = identities.identities.find(
                    (id) => id.provider === "google"
                  );
                  if (googleIdentity) {
                    await unlinkProvider(googleIdentity.$id);
                    setLinkedProviders(
                      linkedProviders.filter((p) => p !== "google")
                    );
                    setLinkStatus("Google account unlinked successfully.");
                    setTimeout(() => setLinkStatus(null), 5000);
                  }
                } catch (error) {
                  console.error("Failed to unlink Google:", error);
                  setLinkStatus(
                    "Failed to unlink Google account. Please try again."
                  );
                  setTimeout(() => setLinkStatus(null), 5000);
                }
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />{" "}
              {!userHasPassword ? "Create Password First" : "Unlink"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!storeUser) return;
                const origin = window.location.origin;
                await signInWithGoogle({
                  successUrl: `${origin}/auth/oauth/callback?link=true&redirectTo=${encodeURIComponent(
                    `/users/${storeUser.displaySlug || storeUser.username}`
                  )}`,
                  failureUrl: `${origin}/users/${
                    storeUser.displaySlug || storeUser.username
                  }?oauth=failed`,
                });
              }}
            >
              <LogIn className="mr-2 h-4 w-4" /> Link Google
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-3 border-t border-border pt-4">
        <label className="text-sm font-medium">Messaging Settings</label>
        <div className="p-4 border border-border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
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

          <div>
            <h3 className="text-sm font-medium mb-2">Privacy</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Control how you appear to others when messaging.
            </p>

            <div className="space-y-3">
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

          <div>
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
