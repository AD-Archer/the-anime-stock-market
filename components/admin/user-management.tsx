"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
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
import {
  Ban,
  Trash2,
  ShieldCheck,
  User,
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
    type: "money" | "stocks" | "admin" | null;
    userId: string | null;
  }>({ type: null, userId: null });

  const [moneyAmount, setMoneyAmount] = useState("");
  const [stockId, setStockId] = useState("");
  const [stockShares, setStockShares] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBanToggle = (userId: string, isBanned: boolean) => {
    if (isBanned) {
      unbanUser(userId);
      toast({
        title: "User Unbanned",
        description: "The user can now access the platform.",
      });
    } else {
      banUser(userId);
      toast({
        title: "User Banned",
        description: "The user has been banned from the platform.",
      });
    }
  };

  const handleDelete = (userId: string) => {
    deleteUser(userId);
    toast({
      title: "User Deleted",
      description: "The user and all their data have been removed.",
    });
    setDeleteConfirm(null);
  };

  const handleAdminToggle = (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      removeUserAdmin(userId);
      toast({
        title: "Admin Rights Removed",
        description: "The user is no longer an admin.",
      });
    } else {
      makeUserAdmin(userId);
      toast({
        title: "Admin Rights Granted",
        description: "The user is now an admin.",
      });
    }
  };

  const handleMoneyAction = (give: boolean) => {
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

    if (give) {
      giveUserMoney(actionDialog.userId, amount);
      toast({
        title: "Money Given",
        description: `$${amount.toFixed(
          2
        )} has been added to the user's balance.`,
      });
    } else {
      takeUserMoney(actionDialog.userId, amount);
      toast({
        title: "Money Taken",
        description: `$${amount.toFixed(
          2
        )} has been removed from the user's balance.`,
      });
    }

    setActionDialog({ type: null, userId: null });
    setMoneyAmount("");
  };

  const handleStockAction = (give: boolean) => {
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

    if (give) {
      giveUserStocks(actionDialog.userId, stockId, shares);
      toast({
        title: "Stocks Given",
        description: `${shares} shares have been added to the user's portfolio.`,
      });
    } else {
      removeUserStocks(actionDialog.userId, stockId, shares);
      toast({
        title: "Stocks Removed",
        description: `${shares} shares have been removed from the user's portfolio.`,
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
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-foreground">
                        {user.username}
                      </CardTitle>
                      {user.isAdmin && <Badge>Admin</Badge>}
                      {user.isBanned && (
                        <Badge variant="destructive">Banned</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined: {user.createdAt.toLocaleDateString()}
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
                    onClick={() => handleBanToggle(user.id, user.isBanned)}
                  >
                    <Ban
                      className={`h-4 w-4 ${
                        user.isBanned ? "text-chart-4" : "text-destructive"
                      }`}
                    />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirm(user.id)}
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
    </div>
  );
}
