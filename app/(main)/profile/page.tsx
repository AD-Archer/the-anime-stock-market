"use client";

import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  User,
  Wallet,
  BarChart3,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { account } from "@/lib/appwrite";

export default function ProfilePage() {
  const { user, updateName, updatePassword, loading: authLoading } = useAuth();
  const {
    currentUser,
    getUserPortfolio,
    stocks,
    transactions,
    isLoading,
    updateContentPreferences,
  } = useStore();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [jwt, setJwt] = useState<string | null>(null);
  const [jwtStatus, setJwtStatus] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [showSpoilersPreference, setShowSpoilersPreference] = useState(
    currentUser?.showSpoilers ?? true
  );
  const [showNsfwPreference, setShowNsfwPreference] = useState(
    currentUser?.showNsfw ?? true
  );
  const [portfolioPublicPreference, setPortfolioPublicPreference] = useState(
    currentUser?.isPortfolioPublic ?? false
  );
  const [preferenceLoading, setPreferenceLoading] = useState<
    null | "spoilers" | "nsfw" | "portfolio"
  >(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (currentUser) {
      setShowSpoilersPreference(currentUser.showSpoilers);
      setShowNsfwPreference(currentUser.showNsfw);
      setPortfolioPublicPreference(currentUser.isPortfolioPublic);
    }
  }, [currentUser]);

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
      await updatePassword(currentPassword, newPassword);
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
    key: "showSpoilers" | "showNsfw" | "isPortfolioPublic",
    value: boolean
  ) => {
    const loadingKey =
      key === "showSpoilers"
        ? "spoilers"
        : key === "showNsfw"
        ? "nsfw"
        : "portfolio";
    setPreferenceLoading(loadingKey);
    try {
      await updateContentPreferences({ [key]: value });
    } catch (error) {
      console.error("Failed to update content preference", error);
      if (key === "showSpoilers") {
        setShowSpoilersPreference((prev) => !prev);
      } else {
        if (key === "showNsfw") {
          setShowNsfwPreference((prev) => !prev);
        } else {
          setPortfolioPublicPreference((prev) => !prev);
        }
      }
    } finally {
      setPreferenceLoading(null);
    }
  };

  if (authLoading || !user || isLoading || !currentUser) {
    return <div>Loading...</div>;
  }

  const portfolio = currentUser ? getUserPortfolio(currentUser.id) : [];
  const userTransactions = currentUser
    ? transactions
        .filter((t) => t.userId === currentUser.id)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    : [];

  // Calculate portfolio stats
  const portfolioStats = portfolio.reduce(
    (acc, p) => {
      const stock = stocks.find((s) => s.id === p.stockId);
      if (!stock) return acc;

      const currentValue = stock.currentPrice * p.shares;
      const invested = p.averageBuyPrice * p.shares;
      const profitLoss = currentValue - invested;
      const profitLossPercent = (profitLoss / invested) * 100;

      const portfolioItem = {
        ...p,
        stock,
        currentValue,
        invested,
        profitLoss,
        profitLossPercent,
      };

      return {
        portfolioWithDetails: [...acc.portfolioWithDetails, portfolioItem],
        totalPortfolioValue: acc.totalPortfolioValue + currentValue,
        totalInvested: acc.totalInvested + invested,
      };
    },
    {
      portfolioWithDetails: [] as any[],
      totalPortfolioValue: 0,
      totalInvested: 0,
    }
  );

  const { portfolioWithDetails, totalPortfolioValue, totalInvested } =
    portfolioStats;

  const totalProfitLoss = totalPortfolioValue - totalInvested;
  const totalProfitLossPercent =
    totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
  const totalAssets = (currentUser?.balance || 0) + totalPortfolioValue;

  return (
    <div className="bg-background" key={user?.id ?? "profile"}>
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground">
                  {user.name || user.email}
                </h1>
                <p className="text-muted-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Member since{" "}
                  {currentUser
                    ? new Date(currentUser.createdAt).toLocaleDateString()
                    : "Unknown"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                {isSettingsExpanded ? "Hide Settings" : "Edit Profile"}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Settings */}
        <div
          className={`mb-8 overflow-hidden transition-all duration-300 ease-in-out ${
            isSettingsExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
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
                        if (newName && newName !== user.name) {
                          await updateName(newName);
                          setDisplayName(newName);
                        } else if (!newName) {
                          setDisplayName(user.name || "");
                        }
                        setIsEditingName(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        } else if (e.key === "Escape") {
                          setDisplayName(user.name || "");
                          setIsEditingName(false);
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your display name"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setDisplayName(user.name || "");
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
                      {user.name || "No display name set"}
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
              <p className="text-sm text-muted-foreground">{user.email}</p>
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
                  <span className="text-xs text-muted-foreground">
                    {jwtStatus}
                  </span>
                )}
              </div>
              {jwt && (
                <p className="text-xs break-all rounded bg-muted p-2 font-mono">
                  {jwt}
                </p>
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
                      Allow other users to view your holdings on your public
                      profile.
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
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}

        {/* Stats Overview */}
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Assets
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ${totalAssets.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Cash + Portfolio Value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cash Balance
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ${currentUser?.balance.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground">
                Available to trade
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Portfolio Value
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ${totalPortfolioValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {portfolio.length} holdings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total P/L</CardTitle>
              {totalProfitLoss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-chart-4" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  totalProfitLoss >= 0 ? "text-chart-4" : "text-destructive"
                }`}
              >
                {totalProfitLoss >= 0 ? "+" : ""}${totalProfitLoss.toFixed(2)}
              </div>
              <p
                className={`text-xs ${
                  totalProfitLoss >= 0 ? "text-chart-4" : "text-destructive"
                }`}
              >
                {totalProfitLoss >= 0 ? "+" : ""}
                {totalProfitLossPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio & History */}
        <Card>
          <CardHeader>
            <CardTitle>Trading Activity</CardTitle>
            <CardDescription>
              Your portfolio and transaction history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="portfolio">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="portfolio">
                  Portfolio ({portfolio.length})
                </TabsTrigger>
                <TabsTrigger value="history">
                  Transaction History ({userTransactions.length})
                </TabsTrigger>
                <TabsTrigger value="messaging">Messaging Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="portfolio" className="space-y-4">
                {portfolioWithDetails.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    No holdings yet. Start trading to build your portfolio!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {portfolioWithDetails.map((item) => {
                      if (!item) return null;
                      const isProfit = item.profitLoss >= 0;

                      return (
                        <Link
                          key={item.stockId}
                          href={`/character/${item.stockId}`}
                        >
                          <div className="flex flex-col gap-3 rounded-lg border p-4 transition-all hover:bg-muted">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                                  <Image
                                    src={
                                      item.stock.imageUrl || "/placeholder.svg"
                                    }
                                    alt={item.stock.characterName}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-foreground truncate">
                                    {item.stock.characterName}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {item.stock.anime}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.shares} shares
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                  P/L
                                </p>
                                <p
                                  className={`font-mono font-semibold ${
                                    isProfit
                                      ? "text-chart-4"
                                      : "text-destructive"
                                  }`}
                                >
                                  {isProfit ? "+" : ""}$
                                  {item.profitLoss.toFixed(2)}
                                </p>
                                <p
                                  className={`text-xs ${
                                    isProfit
                                      ? "text-chart-4"
                                      : "text-destructive"
                                  }`}
                                >
                                  {isProfit ? "+" : ""}
                                  {item.profitLossPercent.toFixed(2)}%
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">
                                  Avg Buy Price
                                </p>
                                <p className="font-mono text-foreground">
                                  ${item.averageBuyPrice.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Current Price
                                </p>
                                <p className="font-mono text-foreground">
                                  ${item.stock.currentPrice.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Market Value
                                </p>
                                <p className="font-mono font-semibold text-foreground">
                                  ${item.currentValue.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                {userTransactions.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    No transactions yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {userTransactions.map((tx) => {
                      const stock = stocks.find((s) => s.id === tx.stockId);
                      if (!stock) return null;

                      return (
                        <div
                          key={tx.id}
                          className="flex flex-col gap-2 rounded-lg border p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                                <Image
                                  src={stock.imageUrl || "/placeholder.svg"}
                                  alt={stock.characterName}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-foreground truncate">
                                    {stock.characterName}
                                  </p>
                                  <Badge
                                    variant={
                                      tx.type === "buy"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {tx.type}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <p className="font-mono font-semibold text-foreground">
                              ${tx.totalAmount.toFixed(2)}
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <p>
                                {tx.shares} shares @ $
                                {tx.pricePerShare.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right sm:text-left">
                              <p>
                                {tx.timestamp.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="messaging" className="space-y-4">
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
                      checked={true} // For now, always enabled
                      disabled={true}
                      className="h-4 w-4 accent-primary"
                      title="Direct messaging is currently always enabled"
                    />
                  </div>

                  <div className="p-4 border border-border rounded-lg">
                    <h3 className="text-sm font-medium mb-2">
                      Privacy Settings
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Control who can send you messages and how your messaging
                      appears to others.
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
                          checked={false} // Placeholder for future implementation
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
                          checked={true} // Placeholder for future implementation
                          disabled={true}
                          className="h-4 w-4 accent-primary"
                          title="Currently enabled for all users"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-border rounded-lg">
                    <h3 className="text-sm font-medium mb-2">
                      Message History
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Your direct messages are stored securely and can be
                      accessed from the Messages page.
                    </p>
                    <Link href="/messages">
                      <Button variant="outline" size="sm">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        View Messages
                      </Button>
                    </Link>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
