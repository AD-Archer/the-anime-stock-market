"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, LogOut, Bell, Crown, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificationCenter } from "@/components/notifications/notification-center";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { currentUser, notifications, markAllNotificationsRead } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);

  if (!user || !currentUser) {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={() => (window.location.href = "/auth/signin")}
      >
        Sign In
      </Button>
    );
  }

  const displayName = user.name || user.email || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
        onClick={() => setShowNotifications(true)}
      >
        <Bell className="h-5 w-5" />
        {notifications.some((n) => !n.read) && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                Balance: ${currentUser.balance.toFixed(2)}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href={`/users/${currentUser.id}`} className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/messages" className="flex items-center">
              <MessageCircle className="mr-2 h-4 w-4" />
              <span>Messages</span>
            </a>
          </DropdownMenuItem>
          {currentUser.isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/admin" className="flex items-center">
                  <Crown className="mr-2 h-4 w-4" />
                  <span>Admin Panel</span>
                </a>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={async () => {
              await signOut();
              window.location.href = "/";
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showNotifications} onOpenChange={setShowNotifications} modal={false}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mb-3">
            {notifications.some((n) => !n.read) && (
              <span className="text-xs text-muted-foreground">
                {notifications.filter((n) => !n.read).length} unread
              </span>
            )}
          </div>
          <NotificationCenter modal={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
