"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Ban, Trash2, ShieldCheck, User } from "lucide-react"

export function UserManagement() {
  const { users, banUser, unbanUser, deleteUser, getUserPortfolio, stocks } = useStore()
  const { toast } = useToast()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleBanToggle = (userId: string, isBanned: boolean) => {
    if (isBanned) {
      unbanUser(userId)
      toast({
        title: "User Unbanned",
        description: "The user can now access the platform.",
      })
    } else {
      banUser(userId)
      toast({
        title: "User Banned",
        description: "The user has been banned from the platform.",
      })
    }
  }

  const handleDelete = (userId: string) => {
    deleteUser(userId)
    toast({
      title: "User Deleted",
      description: "The user and all their data have been removed.",
    })
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-4">
      {users.map((user) => {
        const portfolio = getUserPortfolio(user.id)
        let portfolioValue = 0
        portfolio.forEach((p) => {
          const stock = stocks.find((s) => s.id === p.stockId)
          if (stock) {
            portfolioValue += stock.currentPrice * p.shares
          }
        })
        const totalAssets = user.balance + portfolioValue

        return (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    {user.isAdmin ? (
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    ) : (
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-foreground">{user.username}</CardTitle>
                      {user.isAdmin && <Badge>Admin</Badge>}
                      {user.isBanned && <Badge variant="destructive">Banned</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Joined: {user.createdAt.toLocaleDateString()}</p>
                  </div>
                </div>
                {!user.isAdmin && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleBanToggle(user.id, user.isBanned)}>
                      <Ban className={`h-4 w-4 ${user.isBanned ? "text-chart-4" : "text-destructive"}`} />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setDeleteConfirm(user.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Balance</p>
                  <p className="font-mono text-lg font-bold text-foreground">${user.balance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Portfolio Value</p>
                  <p className="font-mono text-lg font-bold text-foreground">${portfolioValue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Assets</p>
                  <p className="font-mono text-lg font-bold text-foreground">${totalAssets.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Holdings</p>
                  <p className="font-mono text-lg font-bold text-foreground">{portfolio.length} stocks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <Dialog open onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {users.find((u) => u.id === deleteConfirm)?.username}? This action
                cannot be undone and will remove all their data including portfolio and transaction history.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
