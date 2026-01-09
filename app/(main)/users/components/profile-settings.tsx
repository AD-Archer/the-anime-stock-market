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
import { useToast } from "@/hooks/use-toast";
import type { Stock, User } from "@/lib/types";
import {
  MessageCircle,
  LogIn,
  LogOut,
  CheckCircle2,
  Monitor,
  Smartphone,
  Globe,
  Shield,
  User as UserIcon,
  Lock,
  Bell,
  Eye,
  Link2,
  Database,
  Crown,
} from "lucide-react";
import type { SessionInfo } from "@/lib/auth";

// Settings tab type
type SettingsTab =
  | "profile"
  | "security"
  | "privacy"
  | "notifications"
  | "connections"
  | "data";

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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
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
  const { toast } = useToast();
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [preferenceLoading, setPreferenceLoading] = useState<
    null | "spoilers" | "nsfw" | "portfolio" | "transactions"
  >(null);
  const [notificationPreferenceLoading, setNotificationPreferenceLoading] =
    useState<null | "email" | "direct">(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const {
    signInWithGoogle,
    getLinkedProviders,
    createPassword,
    hasPassword,
    getSessions,
    deleteSession,
    deleteAllOtherSessions,
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

  // Sessions state
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

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

  // Load active sessions
  useEffect(() => {
    const loadSessions = async () => {
      if (!authUser) return;
      setLoadingSessions(true);
      try {
        const sessionList = await getSessions();
        setSessions(sessionList);
        // Find current session
        const current = sessionList.find((s) => s.current);
        setCurrentSessionId(current?.id || null);
      } catch (error) {
        console.error("Failed to load sessions:", error);
      } finally {
        setLoadingSessions(false);
      }
    };
    loadSessions();
  }, [authUser, getSessions]);

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
      toast({
        title: avatarUrl ? "Avatar updated" : "Avatar reset",
        description: avatarUrl
          ? "Your profile picture has been updated successfully."
          : "Your profile picture has been reset to default.",
      });
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
    if (isChangingPassword) return; // Prevent double-click

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

    setIsChangingPassword(true);
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
    } finally {
      setIsChangingPassword(false);
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

  // Helper functions for session display
  const getDeviceIcon = (clientName?: string, deviceName?: string) => {
    const client = (clientName || "").toLowerCase();
    const device = (deviceName || "").toLowerCase();

    if (
      device.includes("mobile") ||
      device.includes("phone") ||
      device.includes("android") ||
      device.includes("ios")
    ) {
      return <Smartphone className="h-4 w-4 text-muted-foreground" />;
    }
    if (
      client.includes("chrome") ||
      client.includes("firefox") ||
      client.includes("safari") ||
      client.includes("edge")
    ) {
      return <Globe className="h-4 w-4 text-muted-foreground" />;
    }
    return <Monitor className="h-4 w-4 text-muted-foreground" />;
  };

  const getDeviceLabel = (
    clientName?: string,
    deviceName?: string,
    osName?: string
  ) => {
    const parts: string[] = [];
    if (clientName) parts.push(clientName);
    if (osName) parts.push(osName);
    if (
      deviceName &&
      !osName?.toLowerCase().includes(deviceName.toLowerCase())
    ) {
      parts.push(deviceName);
    }
    return parts.length > 0 ? parts.join(" • ") : "Unknown device";
  };

  // Tab configuration
  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <UserIcon className="h-4 w-4" /> },
    { id: "security", label: "Security", icon: <Lock className="h-4 w-4" /> },
    { id: "privacy", label: "Privacy", icon: <Eye className="h-4 w-4" /> },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell className="h-4 w-4" />,
    },
    {
      id: "connections",
      label: "Connections",
      icon: <Link2 className="h-4 w-4" />,
    },
    { id: "data", label: "Data", icon: <Database className="h-4 w-4" /> },
  ];

  if (authLoading || !authUser || !storeUser) {
    return null;
  }

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Tab Navigation - Horizontal scroll on mobile, sidebar on desktop */}
      <div className="flex gap-4 lg:gap-6">
        {/* Sidebar navigation for desktop */}
        <div className="hidden lg:block w-48 flex-shrink-0">
          <nav className="space-y-1 sticky top-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {/* Mobile tab navigation */}
          <div className="lg:hidden mb-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 p-1 bg-muted rounded-lg min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="bg-card border border-border rounded-lg p-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">
                    Profile Settings
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage your public profile information
                  </p>
                </div>

                {/* Display Name */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Display Name</label>
                  <p className="text-xs text-muted-foreground">
                    This is what other users see on your profile.
                  </p>
                  {isEditingProfile ? (
                    <div className="space-y-3">
                      <Input
                        ref={nameInputRef}
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                      />
                      <p className="text-xs text-muted-foreground">
                        Profile URL:{" "}
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">
                          /@{displaySlug}
                        </code>
                      </p>
                      {profileError && (
                        <p className="text-sm text-red-500">{profileError}</p>
                      )}
                      {profileSuccess && (
                        <p className="text-sm text-green-500">
                          {profileSuccess}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveProfileChanges}
                          disabled={profileSaving}
                          size="sm"
                        >
                          {profileSaving ? "Saving..." : "Save"}
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
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium">
                          {displayName || "No display name set"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{displaySlug}
                        </p>
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

                {/* Profile Picture */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Profile Picture</label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage
                        src={getUserAvatarUrl({
                          id: storeUser.id,
                          username: storeUser.username,
                          avatarUrl: storeUser.avatarUrl,
                        })}
                        alt={storeUser.displayName || storeUser.username}
                      />
                      <AvatarFallback>
                        {getUserInitials(
                          storeUser.displayName || storeUser.username
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      variant="outline"
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {matchingCharacters.map((stock) => (
                            <button
                              key={stock.id}
                              type="button"
                              onClick={() => handleAvatarSelect(stock.imageUrl)}
                              disabled={avatarUpdating}
                              className="flex items-center gap-2 rounded-lg border border-border p-2 text-left text-xs hover:bg-muted transition-colors"
                            >
                              <Image
                                src={stock.imageUrl || "/placeholder.svg"}
                                alt={stock.characterName}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded object-cover"
                              />
                              <span className="font-medium truncate">
                                {stock.characterName}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Premium */}
                <div className="p-4 rounded-lg border border-border bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Crown className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {storeUser.premiumMeta?.isPremium
                          ? "Premium Member"
                          : "Upgrade to Premium"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {storeUser.premiumMeta?.isPremium
                          ? "Thank you for supporting the project!"
                          : "Unlock character creation, priority suggestions, and more."}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        asChild
                      >
                        <Link href="/premium">
                          {storeUser.premiumMeta?.isPremium
                            ? "Manage Premium"
                            : "Learn More"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">
                    {authUser.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your email.
                  </p>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Security</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage your password and active sessions
                  </p>
                </div>

                {/* Password Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </h3>
                  {!userHasPassword ? (
                    <div className="p-4 border border-border rounded-lg bg-muted/30">
                      <p className="text-sm mb-2">
                        You&apos;re signed in with Google. Create a password to
                        enable email sign-in.
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
                        <div className="space-y-3 mt-3">
                          <Input
                            type="password"
                            placeholder="New password"
                            value={createPasswordNew}
                            onChange={(e) =>
                              setCreatePasswordNew(e.target.value)
                            }
                          />
                          <Input
                            type="password"
                            placeholder="Confirm password"
                            value={createPasswordConfirm}
                            onChange={(e) =>
                              setCreatePasswordConfirm(e.target.value)
                            }
                          />
                          {passwordError && (
                            <p className="text-sm text-red-500">
                              {passwordError}
                            </p>
                          )}
                          {passwordSuccess && (
                            <p className="text-sm text-green-500">
                              {passwordSuccess}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button onClick={handleCreatePassword} size="sm">
                              Create
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
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-3">
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
                      <div className="sm:col-span-3 flex flex-wrap gap-2 items-center">
                        <Button
                          onClick={handlePasswordChange}
                          size="sm"
                          disabled={isChangingPassword}
                        >
                          {isChangingPassword
                            ? "Updating..."
                            : "Update Password"}
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
                              setPasswordSuccess(
                                "Reset link sent to your email."
                              );
                            } catch (err: any) {
                              console.warn("Failed to send reset email", err);
                              const raw =
                                err?.message || "Failed to send reset link.";
                              setPasswordError(raw);
                            }
                          }}
                        >
                          Forgot password?
                        </button>
                      </div>
                      {passwordError && (
                        <p className="sm:col-span-3 text-sm text-red-500">
                          {passwordError}
                        </p>
                      )}
                      {passwordSuccess && (
                        <p className="sm:col-span-3 text-sm text-green-500">
                          {passwordSuccess}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Active Sessions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Active Sessions
                    </h3>
                    {sessions.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!confirm("Sign out from all other devices?"))
                            return;
                          try {
                            await deleteAllOtherSessions();
                            const newSessions = await getSessions();
                            setSessions(newSessions);
                            setSessionError(null);
                          } catch (error) {
                            setSessionError("Failed to terminate sessions.");
                          }
                        }}
                      >
                        Sign out others
                      </Button>
                    )}
                  </div>
                  {sessionError && (
                    <p className="text-sm text-red-500">{sessionError}</p>
                  )}
                  {loadingSessions ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="p-3 border border-border rounded-lg animate-pulse"
                        >
                          <div className="h-4 w-32 bg-muted rounded" />
                          <div className="h-3 w-48 bg-muted rounded mt-2" />
                        </div>
                      ))}
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No active sessions found.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {sessions.map((session) => {
                        const isCurrentSession =
                          session.id === currentSessionId;
                        const deviceIcon = getDeviceIcon(
                          session.clientName,
                          session.deviceName
                        );
                        const deviceLabel = getDeviceLabel(
                          session.clientName,
                          session.deviceName,
                          session.osName
                        );
                        return (
                          <div
                            key={session.id}
                            className={`p-3 border rounded-lg ${
                              isCurrentSession
                                ? "border-green-500/30 bg-green-500/5"
                                : "border-border"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <div className="p-1.5 bg-muted rounded">
                                  {deviceIcon}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium truncate">
                                      {deviceLabel}
                                    </p>
                                    {isCurrentSession && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs bg-green-500/10 text-green-600"
                                      >
                                        Current
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {session.ip || "Unknown IP"} •{" "}
                                    {session.countryName || "Unknown"}
                                  </p>
                                </div>
                              </div>
                              {!isCurrentSession && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={async () => {
                                    if (!confirm("Sign out from this device?"))
                                      return;
                                    try {
                                      await deleteSession(session.id);
                                      setSessions(
                                        sessions.filter(
                                          (s) => s.id !== session.id
                                        )
                                      );
                                    } catch (error) {
                                      setSessionError(
                                        "Failed to terminate session."
                                      );
                                    }
                                  }}
                                >
                                  <LogOut className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === "privacy" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Privacy</h2>
                  <p className="text-sm text-muted-foreground">
                    Control what others can see about you
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      key: "showSpoilers" as const,
                      label: "Show Spoilers",
                      description:
                        "Hide comments tagged as spoilers when disabled.",
                      checked: showSpoilersPreference,
                      setChecked: setShowSpoilersPreference,
                      loading: preferenceLoading === "spoilers",
                    },
                    {
                      key: "showNsfw" as const,
                      label: "Show NSFW",
                      description:
                        "Blur or collapse NSFW-tagged comments when disabled.",
                      checked: showNsfwPreference,
                      setChecked: setShowNsfwPreference,
                      loading: preferenceLoading === "nsfw",
                    },
                    {
                      key: "isPortfolioPublic" as const,
                      label: "Public Portfolio",
                      description: "Allow other users to view your holdings.",
                      checked: portfolioPublicPreference,
                      setChecked: setPortfolioPublicPreference,
                      loading: preferenceLoading === "portfolio",
                    },
                    {
                      key: "hideTransactions" as const,
                      label: "Hide Transactions",
                      description:
                        "Hide your transaction history from your public profile.",
                      checked: hideTransactionsPreference,
                      setChecked: setHideTransactionsPreference,
                      loading: preferenceLoading === "transactions",
                    },
                    {
                      key: "anonymousTransactions" as const,
                      label: "Anonymous Transactions",
                      description:
                        "Make your transactions appear anonymous on leaderboards.",
                      checked: anonymousTransactionsPreference,
                      setChecked: setAnonymousTransactionsPreference,
                      loading: preferenceLoading === "transactions",
                    },
                  ].map((pref) => (
                    <div
                      key={pref.key}
                      className="flex items-center justify-between gap-4 p-3 border border-border rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">{pref.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {pref.description}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={pref.checked}
                        onChange={(e) => {
                          const value = e.target.checked;
                          pref.setChecked(value);
                          handlePreferenceChange(pref.key, value);
                        }}
                        disabled={pref.loading}
                        className="h-5 w-5 accent-primary rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Notifications</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose how you want to be notified
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 p-3 border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">
                        Receive a digest of your notifications in your inbox.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailNotificationsEnabled}
                      onChange={(e) =>
                        handleEmailNotificationToggle(e.target.checked)
                      }
                      disabled={notificationPreferenceLoading === "email"}
                      className="h-5 w-5 accent-primary rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 p-3 border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">
                        Direct Message Emails
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Get an email when someone sends you a message.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={directMessageEmailNotifications}
                      onChange={(e) =>
                        handleDirectMessageEmailToggle(e.target.checked)
                      }
                      disabled={notificationPreferenceLoading === "direct"}
                      className="h-5 w-5 accent-primary rounded"
                    />
                  </div>
                </div>

                {/* Messages Link */}
                <div className="p-4 border border-border rounded-lg bg-muted/30">
                  <h3 className="text-sm font-medium mb-2">Message History</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Your direct messages are stored securely and can be accessed
                    from the Messages page.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/messages">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      View Messages
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Connections Tab */}
            {activeTab === "connections" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">
                    Connected Accounts
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage your linked social accounts
                  </p>
                </div>

                {linkStatus && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {linkStatus}
                    </p>
                  </div>
                )}

                <div className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Google</p>
                          {loadingProviders ? (
                            <span className="text-xs text-muted-foreground">
                              Loading...
                            </span>
                          ) : linkedProviders.includes("google") ? (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-green-500/10 text-green-600"
                            >
                              Linked
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {linkedProviders.includes("google")
                            ? "Your Google account is permanently linked."
                            : "Link for one-click sign in. Note: Cannot be undone."}
                        </p>
                      </div>
                    </div>
                    {!loadingProviders &&
                      !linkedProviders.includes("google") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!storeUser) return;
                            const origin = window.location.origin;
                            await signInWithGoogle({
                              successUrl: `${origin}/auth/oauth/callback?link=true&redirectTo=${encodeURIComponent(
                                `/users/${
                                  storeUser.displaySlug || storeUser.username
                                }`
                              )}`,
                              failureUrl: `${origin}/users/${
                                storeUser.displaySlug || storeUser.username
                              }?oauth=failed`,
                            });
                          }}
                        >
                          <LogIn className="mr-2 h-4 w-4" />
                          Link
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Data Tab */}
            {activeTab === "data" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Your Data</h2>
                  <p className="text-sm text-muted-foreground">
                    Export or delete your account data
                  </p>
                </div>

                {/* Export */}
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Export Data</p>
                      <p className="text-xs text-muted-foreground">
                        Download a JSON export of your profile, trades,
                        comments, and messages.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onExportData}
                    >
                      Export
                    </Button>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <p className="text-sm font-medium text-foreground">
                    Delete Account
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This schedules your account for deletion. Contact support if
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
                    <p className="mt-2 text-xs text-muted-foreground">
                      {deleteStatus}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
            <Badge variant="secondary">Private</Badge>
            Settings are only visible to you.
          </div>
        </div>
      </div>
    </div>
  );
}
