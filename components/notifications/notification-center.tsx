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
import { getUserProfileHref } from "@/lib/user-profile";

export function NotificationCenter({ modal = false }: { modal?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToggleEnabled = !modal;
  const isOpen =
    queryToggleEnabled && searchParams.get("notifications") === "open";
  const {
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    buybackOffers,
    currentUser,
    sendNotification,
    stocks,
    friends,
    users,
    acceptFriendRequest,
    declineFriendRequest,
    acceptBuybackOffer,
    declineBuybackOffer,
    getUserPortfolio,
  } = useStore();

  const [filterType, setFilterType] = useState<string>("all");
  const [sellQuantities, setSellQuantities] = useState<Record<string, string>>(
    {}
  );

  const notifications = user?.id ? getUserNotifications(user.id) : [];

  useEffect(() => {
    if (!modal) return;
    // Ensure the notifications query param doesn't get stuck when used inside dialogs
    if (isOpen) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("notifications");
      router.replace(
        searchParams.toString() ? "?" + newSearchParams.toString() : "?"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, isOpen]);

  useEffect(() => {
    if (user?.id) {
      const currentNotifications = getUserNotifications(user.id);
      const activeBuyback = buybackOffers.find(
        (offer) =>
          offer.status === "active" &&
          offer.expiresAt > new Date() &&
          (!offer.targetUsers || offer.targetUsers.includes(user.id))
      );

      if (activeBuyback) {
        const existingNotification = currentNotifications.find(
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
  }, [user?.id, buybackOffers, sendNotification, stocks, getUserNotifications]);

  const retentionMs = 3 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const isClearedWithinRetention = (notification: Notification) =>
    !!notification.clearedAt &&
    now - notification.clearedAt.getTime() <= retentionMs;

  const filteredNotifications = notifications.filter((notification) => {
    const cleared = isClearedWithinRetention(notification);
    if (filterType === "cleared") {
      return cleared;
    }
    if (notification.clearedAt) {
      return false;
    }
    if (filterType === "all") return true;
    if (filterType === "unread") return !notification.read;
    return notification.type === filterType;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const emptyMessage =
    filterType === "cleared"
      ? "No cleared notifications in the last 3 days"
      : filterType === "all"
      ? "No notifications yet"
      : filterType === "unread"
      ? "No unread notifications"
      : `No ${filterType.replace(/_/g, " ")} notifications`;

  const handleMarkRead = async (notificationId: string) => {
    await markNotificationRead(notificationId);
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
    } else if (notification.type === "friend_request") {
      const userId = notification.data?.requesterId as string | undefined;
      if (userId) {
        const requester = users.find((u) => u.id === userId);
        router.push(getUserProfileHref(requester, userId));
      }
    }
    await handleMarkRead(notification.id);
  };

  const getPendingRequestForNotification = (notification: Notification) => {
    if (!currentUser || notification.type !== "friend_request") return null;
    const data = notification.data as {
      requesterId?: string;
      requestId?: string;
    };
    const byId = data?.requestId
      ? friends.find(
          (f) =>
            f.id === data.requestId &&
            f.receiverId === currentUser.id &&
            f.status === "pending"
        )
      : undefined;
    if (byId) return byId;
    if (!data?.requesterId) return null;
    return (
      friends.find(
        (f) =>
          f.requesterId === data.requesterId &&
          f.receiverId === currentUser.id &&
          f.status === "pending"
      ) ?? null
    );
  };

  const getBuybackOfferForNotification = (notification: Notification) => {
    if (notification.type !== "buyback_offer") return null;
    const buybackOfferId = notification.data?.buybackOfferId as
      | string
      | undefined;
    if (!buybackOfferId) return null;
    return (
      buybackOffers.find(
        (o) => o.id === buybackOfferId && o.status === "active"
      ) ?? null
    );
  };

  const notificationContent = (
    <div className={modal ? "" : "p-2"}>
      {!modal && <h4 className="font-semibold text-sm mb-2">Notifications</h4>}

      {modal && (
        <div className="mb-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full" suppressHydrationWarning>
              <SelectValue placeholder="Filter notifications" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notifications</SelectItem>
              <SelectItem value="unread">Unread Only</SelectItem>
              <SelectItem value="cleared">Cleared Notifications</SelectItem>
              <SelectItem value="admin_message">Admin Messages</SelectItem>
              <SelectItem value="buyback_offer">Buyback Offers</SelectItem>
              <SelectItem value="liquidity_request">
                Liquidity Requests
              </SelectItem>
              <SelectItem value="system">System Notifications</SelectItem>
              <SelectItem value="moderation">Moderation</SelectItem>
              <SelectItem value="direct_message">Direct Messages</SelectItem>
              <SelectItem value="friend_request">Friend Requests</SelectItem>
              <SelectItem value="character_suggestion">
                Character Suggestions
              </SelectItem>
            </SelectContent>
          </Select>

          <p className="text-xs text-muted-foreground mt-1">
            Cleared notifications stay visible for 3 days in the Cleared filter.
          </p>

          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={async () => {
                if (currentUser) {
                  await markAllNotificationsRead(currentUser.id);
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
                  setFilterType("cleared");
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
          {emptyMessage}
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
                  <p className="text-sm font-medium break-words whitespace-normal">
                    {notification.title}
                  </p>
                  <div className="flex items-center gap-1 mb-1">
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase"
                    >
                      {notification.type.replace("_", " ")}
                    </Badge>
                    {!notification.read && (
                      <span className="text-[10px] text-primary">New</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground break-words whitespace-normal">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notification.createdAt.toLocaleDateString()}
                  </p>
                  {notification.type === "friend_request" &&
                    currentUser &&
                    (() => {
                      const pending =
                        getPendingRequestForNotification(notification);
                      if (!pending) return null;
                      return (
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            onClick={async (event) => {
                              event.stopPropagation();
                              await acceptFriendRequest(pending.id);
                              await handleMarkRead(notification.id);
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async (event) => {
                              event.stopPropagation();
                              await declineFriendRequest(pending.id);
                              await handleMarkRead(notification.id);
                            }}
                          >
                            Decline
                          </Button>
                        </div>
                      );
                    })()}
                  {notification.type === "buyback_offer" &&
                    currentUser &&
                    (() => {
                      const offer =
                        getBuybackOfferForNotification(notification);
                      if (!offer) return null;
                      const stock = stocks.find((s) => s.id === offer.stockId);
                      if (!stock) return null;
                      const userPortfolio = getUserPortfolio(currentUser.id);
                      const userShares =
                        userPortfolio.find((p) => p.stockId === stock.id)
                          ?.shares || 0;
                      const sellQty =
                        sellQuantities[notification.id] ??
                        (userShares > 0 ? "" : "0");
                      const remainingCap = offer.targetShares
                        ? Math.max(
                            offer.targetShares - (offer.acceptedShares ?? 0),
                            0
                          )
                        : undefined;
                      const maxSell =
                        remainingCap !== undefined
                          ? Math.min(userShares, remainingCap)
                          : userShares;
                      return (
                        <div className="mt-2 flex gap-2 items-center">
                          <input
                            type="number"
                            min={1}
                            max={Math.max(maxSell, 0)}
                            value={sellQty}
                            onChange={(e) =>
                              setSellQuantities((prev) => ({
                                ...prev,
                                [notification.id]: e.target.value,
                              }))
                            }
                            placeholder={maxSell > 0 ? `Max ${maxSell}` : "0"}
                            className="w-24 rounded border px-2 py-1 text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={async (event) => {
                              event.stopPropagation();
                              const qty = Number.parseInt(sellQty || "0");
                              if (maxSell > 0 && qty > 0) {
                                acceptBuybackOffer(
                                  offer.id,
                                  Math.min(qty, maxSell)
                                );
                                await handleMarkRead(notification.id);
                              }
                            }}
                            disabled={maxSell === 0}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async (event) => {
                              event.stopPropagation();
                              declineBuybackOffer(offer.id);
                              await handleMarkRead(notification.id);
                            }}
                          >
                            Decline
                          </Button>
                        </div>
                      );
                    })()}
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
