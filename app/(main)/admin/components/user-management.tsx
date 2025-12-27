"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { PremiumMeta, User as UserType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getUserProfileHref } from "@/lib/user-profile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { sendSystemEvent } from "@/lib/system-events-client";
import Link from "next/link";
import {
  Ban,
  Trash2,
  ShieldCheck,
  User as UserIcon,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Crown,
  Star,
} from "lucide-react";
import { StockSelector } from "@/components/stock-selector";
import {
  DEFAULT_PREMIUM_META,
  getPremiumQuotaStatus,
  getPremiumTierByDonation,
  getMonthlyDonationTotal,
  getMonthlyDonationTotalFromHistory,
  getDonationsForMonth,
  getLatestDonation,
  PREMIUM_TIERS,
  getTierForMeta,
} from "@/lib/premium";

export function UserManagement() {
  const {
    users,
    stocks,
    transactions,
    currentUser,
    banUser,
    unbanUser,
    deleteUser,
    getUserPortfolio,
    makeUserAdmin,
    removeUserAdmin,
    giveUserMoney,
    takeUserMoney,
    giveUserStocks,
    removeUserStocks,
    sendNotification,
    getStockPriceHistory,
    setPremiumStatus,
    updatePremiumMeta,
    logAdminAction,
  } = useStore();
  const { toast } = useToast();

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: "money" | "stocks" | "admin" | "ban" | null;
    userId: string | null;
  }>({ type: null, userId: null });

  const [moneyAmount, setMoneyAmount] = useState("");
  const [stockId, setStockId] = useState("");
  const [stockShares, setStockShares] = useState("");
  const [banDuration, setBanDuration] = useState<
    "week" | "month" | "year" | "forever"
  >("week");
  const [customBanDate, setCustomBanDate] = useState("");
  const [donationDialogUser, setDonationDialogUser] =
    useState<UserType | null>(null);
  const [donationAmountInput, setDonationAmountInput] = useState("");
  const [donationDateInput, setDonationDateInput] = useState("");
  const [isSavingDonation, setIsSavingDonation] = useState(false);
  const [expandedPremiumUserId, setExpandedPremiumUserId] =
    useState<string | null>(null);

  const isUserBanned = (user: UserType): boolean => {
    return user.bannedUntil !== null && user.bannedUntil > new Date();
  };

  const getBanStatus = (user: UserType): string => {
    if (user.pendingDeletionAt) {
      return `Deletion scheduled for ${user.pendingDeletionAt.toLocaleDateString()}`;
    }
    if (!user.bannedUntil) return "Not banned";
    if (user.bannedUntil > new Date()) {
      return `Banned until ${user.bannedUntil.toLocaleDateString()}`;
    }
    return "Ban expired";
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBanToggle = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const isBanned = isUserBanned(user);

    // Prevent banning yourself
    if (!isBanned && userId === currentUser?.id) {
      toast({
        title: "Cannot Ban Yourself",
        description: "You cannot ban your own account.",
        variant: "destructive",
      });
      return;
    }

    if (isBanned) {
      unbanUser(userId);
      toast({
        title: "User Unbanned",
        description: "The user can now access the platform.",
      });
    } else {
      // Open ban duration dialog
      setActionDialog({ type: "ban", userId });
    }
  };

  const handleBanAction = async () => {
    if (!actionDialog.userId) return;

    try {
      let duration: "week" | "month" | "year" | "forever" | Date = banDuration;

      if (banDuration === "forever") {
        duration = "forever";
      } else if (customBanDate) {
        const customDate = new Date(customBanDate);
        if (customDate > new Date()) {
          duration = customDate;
        } else {
          toast({
            title: "Invalid Date",
            description: "Custom ban date must be in the future.",
            variant: "destructive",
          });
          return;
        }
      }

      await banUser(actionDialog.userId, duration);
      toast({
        title: "User Banned",
        description: `The user has been banned ${
          banDuration === "forever"
            ? "permanently"
            : `until ${
                duration instanceof Date
                  ? duration.toLocaleDateString()
                  : duration
              }`
        }.`,
      });
      setActionDialog({ type: null, userId: null });
      setCustomBanDate("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to ban user.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Cannot Delete Yourself",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }

    const user = users.find((u) => u.id === userId);
    if (!user) return;

    if (user.pendingDeletionAt && user.pendingDeletionAt > new Date()) {
      toast({
        title: "Deletion Already Scheduled",
        description: "This user is already pending removal.",
      });
      setDeleteConfirm(null);
      return;
    }

    try {
      await deleteUser(userId);
      const removalDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      toast({
        title: "Deletion Scheduled",
        description: `User will remain banned until ${removalDate.toLocaleDateString()} and then be permanently removed.`,
      });
      setDeleteConfirm(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule deletion. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAdminToggle = async (userId: string, isAdmin: boolean) => {
    // Prevent removing admin rights from yourself
    if (isAdmin && userId === currentUser?.id) {
      toast({
        title: "Cannot Remove Own Admin Rights",
        description:
          "You cannot remove admin privileges from your own account.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isAdmin) {
        await removeUserAdmin(userId);
        toast({
          title: "Admin Rights Removed",
          description: "The user is no longer an admin.",
        });
      } else {
        await makeUserAdmin(userId);
        toast({
          title: "Admin Rights Granted",
          description: "The user is now an admin.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update admin status.",
        variant: "destructive",
      });
    }
  };

  const handlePremiumToggle = async (user: UserType) => {
    if (!setPremiumStatus) return;
    try {
      const currentlyPremium = Boolean(user.premiumMeta?.isPremium);
      const shouldEnable = !currentlyPremium;
      await setPremiumStatus(user.id, shouldEnable);
      toast({
        title: shouldEnable ? "Premium Granted" : "Premium Revoked",
        description: shouldEnable
          ? `${user.username} now has premium access.`
          : `${user.username} is no longer premium.`,
      });
      sendNotification(
        user.id,
        "admin_message",
        shouldEnable ? "Premium Access Activated" : "Premium Access Revoked",
        shouldEnable
          ? "An admin granted you premium access. Enjoy the extra tools!"
          : "An admin removed your premium access. Reach out to support if you have questions."
      );
      if (shouldEnable) {
        void sendSystemEvent({
          type: "premium_status_changed",
          userId: user.id,
          metadata: {
            enabled: true,
            performedBy: currentUser?.id,
          },
        });
      }
    } catch (error) {
      toast({
        title: "Action Failed",
        description: "Could not update premium status.",
        variant: "destructive",
      });
    }
  };

  const resetDonationDialog = () => {
    setDonationDialogUser(null);
    setDonationAmountInput("");
    setDonationDateInput("");
  };

  const openDonationDialog = (user: UserType) => {
    const meta: PremiumMeta = user.premiumMeta ?? DEFAULT_PREMIUM_META;
    setDonationDialogUser(user);
    setDonationAmountInput(
      meta.donationAmount !== undefined ? String(meta.donationAmount) : ""
    );
    setDonationDateInput(
      meta.donationDate
        ? new Date(meta.donationDate).toISOString().slice(0, 16)
        : ""
    );
  };

  const handleDonationSave = async () => {
    if (!donationDialogUser) return;
    setIsSavingDonation(true);
    try {
      const parsedAmount =
        donationAmountInput.trim().length > 0
          ? Number.parseFloat(donationAmountInput)
          : undefined;
      if (
        parsedAmount === undefined ||
        Number.isNaN(parsedAmount) ||
        parsedAmount <= 0
      ) {
        throw new Error("Please enter a valid donation amount.");
      }
      const entryDate = donationDateInput
        ? new Date(donationDateInput)
        : new Date();
      const history =
        donationDialogUser.premiumMeta?.donationHistory ?? [];
      const nextHistory = [...history, { amount: parsedAmount, date: entryDate }];
      const pseudoMeta: PremiumMeta = {
        ...donationDialogUser.premiumMeta,
        donationHistory: nextHistory,
      };
      const monthlyTotal = getMonthlyDonationTotal(pseudoMeta, entryDate);
      const computedTier = getPremiumTierByDonation(monthlyTotal);
      const wasPremium = Boolean(donationDialogUser.premiumMeta?.isPremium);
      const enablePremium = Boolean(computedTier);
      const nextMeta: Partial<PremiumMeta> = {
        donationHistory: nextHistory,
        donationDate: entryDate,
        donationAmount: monthlyTotal,
        tierLevel: computedTier?.level,
      };
      if (enablePremium) {
        nextMeta.isPremium = true;
        if (!donationDialogUser.premiumMeta?.premiumSince) {
          nextMeta.premiumSince = new Date();
        }
      }
      await updatePremiumMeta(donationDialogUser.id, nextMeta);
      await logAdminAction("premium_tier_update", donationDialogUser.id, {
        donationAmount: monthlyTotal,
        tierLevel: computedTier?.level,
        tierLabel: computedTier?.label,
        entryAmount: parsedAmount,
        entryDate: entryDate.toISOString(),
      });
      if (!wasPremium && enablePremium) {
        void sendSystemEvent({
          type: "premium_status_changed",
          userId: donationDialogUser.id,
          metadata: {
            enabled: true,
            performedBy: currentUser?.id,
          },
        });
      }
      if (computedTier) {
        sendNotification(
          donationDialogUser.id,
          "admin_message",
          "Premium tier updated",
          `Your account is now ${computedTier.label} after donating $${monthlyTotal.toFixed(
            2
          )} this month.`
        );
      } else {
        sendNotification(
          donationDialogUser.id,
          "admin_message",
          "Premium tier updated",
          "Your donation record has been updated."
        );
      }
      resetDonationDialog();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save donation info.",
        variant: "destructive",
      });
    } finally {
      setIsSavingDonation(false);
    }
  };

  const previewAmountValue =
    donationAmountInput.trim().length > 0
      ? Number.parseFloat(donationAmountInput)
      : undefined;
  const previewDate = donationDateInput
    ? new Date(donationDateInput)
    : new Date();
  const isPreviewAmountInvalid =
    donationAmountInput.trim().length > 0 &&
    (Number.isNaN(previewAmountValue ?? Number.NaN) ||
      (previewAmountValue ?? 0) <= 0);
  const previewHistory = donationDialogUser?.premiumMeta?.donationHistory ?? [];
  const previewMonthlyExisting =
    getMonthlyDonationTotalFromHistory(previewHistory, previewDate);
  const previewMonthlyTotal =
    (isPreviewAmountInvalid ? 0 : previewAmountValue ?? 0) +
    previewMonthlyExisting;
  const donationTierPreview =
    isPreviewAmountInvalid || previewMonthlyTotal === 0
      ? undefined
      : getPremiumTierByDonation(previewMonthlyTotal);
  const previewMonthLabel = previewDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const handleMoneyAction = async (give: boolean) => {
    if (!actionDialog.userId) return;

    const amount = Number.parseFloat(moneyAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (give) {
        await giveUserMoney(actionDialog.userId, amount);
        toast({
          title: "Money Given",
          description: `$${amount.toFixed(
            2
          )} has been added to the user's balance.`,
        });
      } else {
        await takeUserMoney(actionDialog.userId, amount);
        toast({
          title: "Money Taken",
          description: `$${amount.toFixed(
            2
          )} has been removed from the user's balance.`,
        });
      }
    } catch (error) {
      toast({
        title: "Action Failed",
        description: "Failed to update user balance. Please try again.",
        variant: "destructive",
      });
    }

    setActionDialog({ type: null, userId: null });
    setMoneyAmount("");
  };

  const handleStockAction = async (give: boolean) => {
    if (!actionDialog.userId || !stockId) return;

    const shares = Number.parseInt(stockShares);
    if (isNaN(shares) || shares <= 0) {
      toast({
        title: "Invalid Shares",
        description: "Please enter a valid number of shares.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (give) {
        await giveUserStocks(actionDialog.userId, stockId, shares);
        toast({
          title: "Stocks Given",
          description: `${shares} shares have been added to the user's portfolio.`,
        });
      } else {
        await removeUserStocks(actionDialog.userId, stockId, shares);
        toast({
          title: "Stocks Removed",
          description: `${shares} shares have been removed from the user's portfolio.`,
        });
      }
    } catch (error) {
      toast({
        title: "Action Failed",
        description: "Failed to update user portfolio. Please try again.",
        variant: "destructive",
      });
    }

    setActionDialog({ type: null, userId: null });
    setStockId("");
    setStockShares("");
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* User List */}
      {filteredUsers.map((user) => {
        const portfolio = getUserPortfolio(user.id);
        const premiumMeta = user.premiumMeta ?? DEFAULT_PREMIUM_META;
        const isPremium = Boolean(premiumMeta.isPremium);
        const quotaStatus = isPremium
          ? getPremiumQuotaStatus(premiumMeta)
          : null;
        const userTier = getTierForMeta(premiumMeta);
        const monthlyDonationTotal = getMonthlyDonationTotal(premiumMeta);
        const currentMonthLabel = new Date().toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
        const thisMonthDonations = getDonationsForMonth(premiumMeta);
        const latestDonation = getLatestDonation(premiumMeta);
        const isPremiumSectionOpen = expandedPremiumUserId === user.id;
        let portfolioValue = 0;
        portfolio.forEach((p) => {
          const stock = stocks.find((s) => s.id === p.stockId);
          if (stock) {
            portfolioValue += stock.currentPrice * p.shares;
          }
        });
        const totalAssets = user.balance + portfolioValue;

        return (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                    {user.isAdmin ? (
                      <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    ) : (
                      <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base sm:text-lg text-foreground line-clamp-1">
                        <Link
                          href={getUserProfileHref(user, user.id)}
                          className="hover:underline"
                        >
                          {user.username}
                        </Link>
                      </CardTitle>
                      {user.isAdmin && <Badge className="text-xs">Admin</Badge>}
                      {isUserBanned(user) && (
                        <Badge variant="destructive" className="text-xs">
                          Banned
                        </Badge>
                      )}
                      {user.pendingDeletionAt && (
                        <Badge variant="outline" className="text-xs">
                          Deletion Scheduled
                        </Badge>
                      )}
                      {isPremium && (
                        <Badge variant="secondary" className="text-xs">
                          Premium
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                      {user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined: {user.createdAt.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getBanStatus(user)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 sm:flex-col">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActionDialog({ type: "money", userId: user.id })
                    }
                    className="flex-1 sm:flex-none h-8 sm:h-9"
                  >
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActionDialog({ type: "stocks", userId: user.id })
                    }
                    className="flex-1 sm:flex-none h-8 sm:h-9"
                  >
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdminToggle(user.id, user.isAdmin)}
                    disabled={user.id === currentUser?.id}
                    className="flex-1 sm:flex-none h-8 sm:h-9"
                  >
                    <ShieldCheck
                      className={`h-3 w-3 sm:h-4 sm:w-4 ${
                        user.isAdmin ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBanToggle(user.id)}
                    disabled={user.id === currentUser?.id}
                    className="flex-1 sm:flex-none h-8 sm:h-9"
                  >
                    <Ban
                      className={`h-3 w-3 sm:h-4 sm:w-4 ${
                        isUserBanned(user) ? "text-chart-4" : "text-destructive"
                      }`}
                    />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirm(user.id)}
                    disabled={
                      user.id === currentUser?.id || !!user.pendingDeletionAt
                    }
                    className="flex-1 sm:flex-none h-8 sm:h-9"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm md:grid-cols-4 md:gap-4">
                <div>
                  <p className="text-muted-foreground">Balance</p>
                  <p className="font-mono text-sm sm:text-lg font-bold text-foreground">
                    ${user.balance.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Portfolio Value</p>
                  <p className="font-mono text-sm sm:text-lg font-bold text-foreground">
                    ${portfolioValue.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Assets</p>
                  <p className="font-mono text-sm sm:text-lg font-bold text-foreground">
                    ${totalAssets.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Holdings</p>
                  <p className="font-mono text-sm sm:text-lg font-bold text-foreground">
                    {portfolio.length} stocks
                  </p>
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-0">
              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Premium access</p>
                    <p className="text-lg font-semibold text-foreground">
                      {isPremium ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() =>
                        setExpandedPremiumUserId(
                          isPremiumSectionOpen ? null : user.id
                        )
                      }
                    >
                      {isPremiumSectionOpen
                        ? "Hide premium usage"
                        : "View premium usage"}
                    </Button>
                    <Button
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => handlePremiumToggle(user)}
                    >
                      <Star className="h-4 w-4" />
                      {isPremium ? "Revoke Premium" : "Grant Premium"}
                    </Button>
                  </div>
                </div>
                {isPremiumSectionOpen && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    {isPremium && quotaStatus ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-xs text-muted-foreground">
                            Current limit
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {quotaStatus.totalLimit} characters/day
                          </p>
                        </div>
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-xs text-muted-foreground">
                            Amount claimed
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {quotaStatus.totalUsed} characters
                          </p>
                        </div>
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-xs text-muted-foreground">
                            Amount left to claim
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {quotaStatus.totalRemaining} characters
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Premium usage details will appear here once access is
                        enabled.
                      </p>
                    )}
                  </div>
                )}
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Donation tier
                      </p>
                      <p className="text-sm text-foreground">
                        {userTier
                          ? `${userTier.label} • ${userTier.characterLimit} characters/day • $${userTier.reward} reward`
                          : "No tier assigned"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {monthlyDonationTotal > 0
                          ? `Donated $${monthlyDonationTotal.toFixed(
                              2
                            )} in ${currentMonthLabel}`
                          : `No donations recorded for ${currentMonthLabel}.`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedPremiumUserId(
                            isPremiumSectionOpen ? null : user.id
                          )
                        }
                      >
                        {isPremiumSectionOpen ? "Collapse" : "View details"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDonationDialog(user)}
                      >
                        Update donation tier
                      </Button>
                    </div>
                  </div>
                  {isPremiumSectionOpen && (
                    <div className="space-y-2 pt-3 border-t border-border">
                      {latestDonation && (
                        <p className="text-xs text-muted-foreground">
                          Latest gift: ${latestDonation.amount.toFixed(2)} on{" "}
                          {latestDonation.date.toLocaleDateString()}
                        </p>
                      )}
                      {thisMonthDonations.length > 0 && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {currentMonthLabel} contributions
                          </p>
                          {thisMonthDonations.map((donation) => (
                            <div
                              key={`${donation.date.toISOString()}-${donation.amount}`}
                              className="flex justify-between text-foreground"
                            >
                              <span>{donation.date.toLocaleDateString()}</span>
                              <span>${donation.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Money Action Dialog */}
      {actionDialog.type === "money" && actionDialog.userId && (
        <Dialog
          open
          onOpenChange={() => setActionDialog({ type: null, userId: null })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage User Money</DialogTitle>
              <DialogDescription>
                Give or take money from{" "}
                {users.find((u) => u.id === actionDialog.userId)?.username}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={moneyAmount}
                  onChange={(e) => setMoneyAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleMoneyAction(false)}
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Take Money
              </Button>
              <Button onClick={() => handleMoneyAction(true)}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Give Money
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Stock Action Dialog */}
      {actionDialog.type === "stocks" && actionDialog.userId && (
        <Dialog
          open
          onOpenChange={() => setActionDialog({ type: null, userId: null })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage User Stocks</DialogTitle>
              <DialogDescription>
                Give or remove stocks from{" "}
                {users.find((u) => u.id === actionDialog.userId)?.username}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <StockSelector
                  stocks={stocks}
                  selectedStockId={stockId}
                  onSelect={setStockId}
                  getStockPriceHistory={getStockPriceHistory}
                  transactions={transactions}
                  label="Stock"
                  helperText="Search characters or anime to pick the stock to gift."
                  className="max-h-[280px]"
                />
              </div>
              <div>
                <Label htmlFor="shares">Number of Shares</Label>
                <Input
                  id="shares"
                  type="number"
                  value={stockShares}
                  onChange={(e) => setStockShares(e.target.value)}
                  placeholder="Enter number of shares"
                  className="bg-card/80 border border-border text-foreground"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleStockAction(false)}
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Remove Stocks
              </Button>
              <Button onClick={() => handleStockAction(true)}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Give Stocks
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <Dialog open onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                {users.find((u) => u.id === deleteConfirm)?.username}? This will
                ban the account for seven days and then permanently remove all
                associated data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Ban Duration Dialog */}
      {actionDialog.type === "ban" && actionDialog.userId && (
        <Dialog
          open
          onOpenChange={() => setActionDialog({ type: null, userId: null })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban User</DialogTitle>
              <DialogDescription>
                Select the duration for banning{" "}
                {users.find((u) => u.id === actionDialog.userId)?.username}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ban Duration</Label>
                <Select
                  value={banDuration}
                  onValueChange={(value: any) => setBanDuration(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">1 Week</SelectItem>
                    <SelectItem value="month">1 Month</SelectItem>
                    <SelectItem value="year">1 Year</SelectItem>
                    <SelectItem value="forever">Permanent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {banDuration !== "forever" && (
                <div className="space-y-2">
                  <Label htmlFor="customDate">Or set custom date</Label>
                  <Input
                    id="customDate"
                    type="datetime-local"
                    value={customBanDate}
                    onChange={(e) => setCustomBanDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActionDialog({ type: null, userId: null })}
              >
                Cancel
              </Button>
              <Button onClick={handleBanAction}>Ban User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Donation Tier Dialog */}
      <Dialog
        open={!!donationDialogUser}
        onOpenChange={(open) => {
          if (!open) {
            resetDonationDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Donation tier</DialogTitle>
            <DialogDescription>
              Record how much the user donated and the team will assign the
              closest tier automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Computed tier</Label>
              <p className="text-sm text-foreground">
                {isPreviewAmountInvalid
                  ? "Enter a valid donation amount to see the matching tier."
                  : previewMonthlyTotal > 0
                  ? `${previewMonthLabel} total: $${previewMonthlyTotal.toFixed(
                      2
                    )}`
                  : "Tier 1 is at $5, Tier 2 at $10, Tier 3 at $20, and Tier 4 at $30."}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPreviewAmountInvalid
                  ? ""
                  : donationTierPreview
                  ? `This would unlock ${donationTierPreview.label}.`
                  : `Add more to reach Tier 1 at $5.`}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="donationAmount">Donation amount</Label>
              <Input
                id="donationAmount"
                type="number"
                step="0.01"
                value={donationAmountInput}
                onChange={(event) => setDonationAmountInput(event.target.value)}
                placeholder="Amount donated"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="donationDate">Donation date</Label>
              <Input
                id="donationDate"
                type="datetime-local"
                value={donationDateInput}
                onChange={(event) => setDonationDateInput(event.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetDonationDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleDonationSave}
                disabled={isSavingDonation}
              >
                {isSavingDonation ? "Saving…" : "Save donation info"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
