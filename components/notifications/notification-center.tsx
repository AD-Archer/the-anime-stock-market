"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Check, X, Filter } from "lucide-react";
import type { Notification } from "@/lib/types";

export function NotificationCenter({
  modal = false,
}: {
  modal?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToggleEnabled = !modal;
  const isOpen = queryToggleEnabled && searchParams.get("notifications") === "open";
  const {
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    buybackOffers,
    currentUser,
    sendNotification,
    stocks,
  } = useStore();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showBuybackModal, setShowBuybackModal] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    if (!modal) return;
    // Ensure the notifications query param doesn't get stuck when used inside dialogs
    if (isOpen) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("notifications");
      router.replace(searchParams.toString() ? "?" + newSearchParams.toString() : "?");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, isOpen]);

  useEffect(() => {
    if (user?.id) {
      const userNotifications = getUserNotifications(user.id);

      setNotifications(userNotifications);

      const activeBuyback = buybackOffers.find(
        (offer) =>
          offer.status === "active" &&
          offer.expiresAt > new Date() &&
          (!offer.targetUsers || offer.targetUsers.includes(user.id))
      );

      if (activeBuyback) {
        const existingNotification = userNotifications.find(
          (n) => n.data?.buybackOfferId === activeBuyback.id
        );

        if (!existingNotification) {
          const stock = stocks.find((s) => s.id === activeBuyback.stockId);
          sendNotification(
            user.id,
            "buyback_offer",
            "Buyback Offer Available",
            `A buyback offer is available for ${
              stock?.characterName || "Unknown Character"
            } at $${activeBuyback.offeredPrice.toFixed(2)} per share.`,
            { buybackOfferId: activeBuyback.id }
          );
        }
      }
    }
  }, [user?.id, getUserNotifications, buybackOffers, sendNotification, stocks]);

  const filteredNotifications = notifications.filter((notification) => {
    if (filterType === "all") return true;
    if (filterType === "unread") return !notification.read;
    return notification.type === filterType;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (notificationId: string) => {
    await markNotificationRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const handleNotificationClick = async (notification: Notification) => {
    // For now, just mark as read. In the future, this could navigate to relevant pages
    // or show modals for specific notification types
    if (notification.type === "buyback_offer") {
      // Could navigate to character page or show buyback modal
      console.log(
        "Buyback notification clicked:",
        notification.data?.buybackOfferId
      );
    }
    await handleMarkRead(notification.id);
  };

  const notificationContent = (
    <div className={modal ? "" : "p-2"}>
      {!modal && <h4 className="font-semibold text-sm mb-2">Notifications</h4>}

      {modal && (
        <div className="mb-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter notifications" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notifications</SelectItem>
              <SelectItem value="unread">Unread Only</SelectItem>
              <SelectItem value="admin_message">Admin Messages</SelectItem>
              <SelectItem value="buyback_offer">Buyback Offers</SelectItem>
              <SelectItem value="liquidity_request">
                Liquidity Requests
              </SelectItem>
              <SelectItem value="system">System Notifications</SelectItem>
              <SelectItem value="moderation">Moderation</SelectItem>
              <SelectItem value="direct_message">Direct Messages</SelectItem>
            </SelectContent>
          </Select>

          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={async () => {
                if (currentUser) {
                  await markAllNotificationsRead(currentUser.id);
                  setNotifications((prev) =>
                    prev.map((n) =>
                      n.userId === currentUser.id ? { ...n, read: true } : n
                    )
                  );
                }
              }}
            >
              Mark all read
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={async () => {
                if (currentUser) {
                  await clearNotifications(currentUser.id);
                  setNotifications((prev) =>
                    prev.filter((n) => n.userId !== currentUser.id)
                  );
                }
              }}
            >
              Clear all
            </Button>
          </div>
        </div>
      )}

      {filteredNotifications.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {filterType === "all"
            ? "No notifications yet"
            : `No ${filterType} notifications`}
        </p>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {filteredNotifications
            .slice(0, modal ? 50 : 10)
            .map((notification) => (
              <div
                key={notification.id}
                className={`p-3 cursor-pointer rounded-md ${
                  !notification.read ? "bg-muted/50" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {notification.title}
                  </p>
                  <div className="flex items-center gap-1 mb-1">
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {notification.type.replace("_", " ")}
                    </Badge>
                    {!notification.read && (
                      <span className="text-[10px] text-primary">New</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notification.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          {filteredNotifications.length > (modal ? 50 : 10) && (
            <p className="text-xs text-muted-foreground text-center py-2">
              +{filteredNotifications.length - (modal ? 50 : 10)} more
              notifications
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (modal) {
    return notificationContent;
  }

  return (
    <>
      <DropdownMenu
        open={isOpen}
        modal={false}
        onOpenChange={(open) => {
          if (!queryToggleEnabled) return;
          const newSearchParams = new URLSearchParams(searchParams);
          if (open) {
            newSearchParams.set("notifications", "open");
          } else {
            newSearchParams.delete("notifications");
          }
          const qs = newSearchParams.toString();
          router.replace(qs ? `?${qs}` : "?");
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          {notificationContent}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
