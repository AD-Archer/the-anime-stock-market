"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { User as UserType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Coins,
} from "lucide-react";

export function UserManagement() {
  const {
    users,
    stocks,
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

  const isUserBanned = (user: UserType): boolean => {
    return user.bannedUntil !== null && user.bannedUntil > new Date();
  };

  const getBanStatus = (user: UserType): string => {
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

  const handleDelete = (userId: string) => {
    // Prevent deleting yourself
    if (userId === currentUser?.id) {
      toast({
        title: "Cannot Delete Yourself",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }

    deleteUser(userId);
    toast({
      title: "User Deleted",
      description: "The user and all their data have been removed.",
    });
    setDeleteConfirm(null);
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
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    {user.isAdmin ? (
                      <Crown className="h-6 w-6 text-primary" />
                    ) : (
                      <UserIcon className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-foreground">
                        <Link
                          href={`/users/${user.id}`}
                          className="hover:underline"
                        >
                          {user.username}
                        </Link>
                      </CardTitle>
                      {user.isAdmin && <Badge>Admin</Badge>}
                      {isUserBanned(user) && (
                        <Badge variant="destructive">Banned</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActionDialog({ type: "money", userId: user.id })
                    }
                  >
                    <DollarSign className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActionDialog({ type: "stocks", userId: user.id })
                    }
                  >
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdminToggle(user.id, user.isAdmin)}
                    disabled={user.id === currentUser?.id}
                  >
                    <ShieldCheck
                      className={`h-4 w-4 ${
                        user.isAdmin ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBanToggle(user.id)}
                    disabled={user.id === currentUser?.id}
                  >
                    <Ban
                      className={`h-4 w-4 ${
                        isUserBanned(user) ? "text-chart-4" : "text-destructive"
                      }`}
                    />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirm(user.id)}
                    disabled={user.id === currentUser?.id}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Balance</p>
                  <p className="font-mono text-lg font-bold text-foreground">
                    ${user.balance.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Portfolio Value</p>
                  <p className="font-mono text-lg font-bold text-foreground">
                    ${portfolioValue.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Assets</p>
                  <p className="font-mono text-lg font-bold text-foreground">
                    ${totalAssets.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Holdings</p>
                  <p className="font-mono text-lg font-bold text-foreground">
                    {portfolio.length} stocks
                  </p>
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
                <Label htmlFor="stock">Stock</Label>
                <Select value={stockId} onValueChange={setStockId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a stock" />
                  </SelectTrigger>
                  <SelectContent>
                    {stocks.map((stock) => (
                      <SelectItem key={stock.id} value={stock.id}>
                        {stock.characterName} - ${stock.currentPrice.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="shares">Number of Shares</Label>
                <Input
                  id="shares"
                  type="number"
                  value={stockShares}
                  onChange={(e) => setStockShares(e.target.value)}
                  placeholder="Enter number of shares"
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
                {users.find((u) => u.id === deleteConfirm)?.username}? This
                action cannot be undone and will remove all their data including
                portfolio and transaction history.
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
    </div>
  );
}
