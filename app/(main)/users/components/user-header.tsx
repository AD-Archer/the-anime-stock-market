"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Share2,
  MessageSquare,
  Settings,
  Crown,
  MoreHorizontal,
  UserPlus,
  UserCheck,
  Clock,
  Check,
  Copy,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserAvatarUrl, getUserInitials } from "@/lib/avatar";
import type { User as StoreUser } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserHeaderProps = {
  profileUser: StoreUser;
  isOwnProfile: boolean;
  canMessage: boolean;
  isSettingsOpen: boolean;
  onShare: () => void;
  onMessage: () => void;
  onToggleSettings: () => void;
};

export function UserHeader({
  profileUser,
  isOwnProfile,
  canMessage,
  isSettingsOpen,
  onShare,
  onMessage,
  onToggleSettings,
}: UserHeaderProps) {
  const [copied, setCopied] = useState(false);
  const {
    currentUser,
    sendFriendRequest,
    friends,
    getPendingFriendRequests,
    acceptFriendRequest,
  } = useStore();
  const { user } = useAuth();

  const friendship = friends.find(
    (f) =>
      f.status === "accepted" &&
      ((f.requesterId === currentUser?.id && f.receiverId === profileUser.id) ||
        (f.requesterId === profileUser.id && f.receiverId === currentUser?.id))
  );
  const isFriend = !!friendship;
  const friendsSince = friendship?.respondedAt ?? friendship?.createdAt;
  const pendingIncoming = getPendingFriendRequests(currentUser?.id || "").find(
    (f) => f.requesterId === profileUser.id
  );
  const pendingOutgoing = friends.find(
    (f) =>
      f.status === "pending" &&
      f.requesterId === currentUser?.id &&
      f.receiverId === profileUser.id
  );

  const memberSince = useMemo(
    () => new Date(profileUser.createdAt),
    [profileUser.createdAt]
  );
  const daysSinceMember = useMemo(() => {
    return Math.floor(
      // eslint-disable-next-line react-hooks/purity
      (Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [memberSince]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-card border border-border rounded-xl overflow-hidden">
      {/* Gradient background banner */}
      <div className="h-24 sm:h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />

      {/* Main header content */}
      <div className="px-4 sm:px-6 pb-6 -mt-12 sm:-mt-16">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-20 w-20 sm:h-28 sm:w-28 border-4 border-background shadow-xl">
              <AvatarImage
                src={getUserAvatarUrl({
                  id: profileUser.id,
                  username: profileUser.username,
                  avatarUrl: profileUser.avatarUrl,
                })}
                alt={profileUser.displayName || profileUser.username}
              />
              <AvatarFallback className="text-lg">
                {getUserInitials(
                  profileUser.displayName || profileUser.username
                )}
              </AvatarFallback>
            </Avatar>
            {profileUser.premiumMeta?.isPremium && (
              <div className="absolute -bottom-1 -right-1 p-1.5 bg-purple-500 rounded-full shadow-lg">
                <Crown className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {profileUser.displayName || profileUser.username}
              </h1>
              {profileUser.isAdmin && (
                <Badge
                  variant="secondary"
                  className="bg-blue-500/10 text-blue-600 border-blue-500/20"
                >
                  Admin
                </Badge>
              )}
              {isFriend && (
                <Badge
                  variant="secondary"
                  className="bg-green-500/10 text-green-600 border-green-500/20"
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  Friend
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>@{profileUser.displaySlug || profileUser.username}</span>
              <span className="hidden sm:inline">•</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    {isFriend && friendsSince
                      ? `Friends since ${friendsSince.toLocaleDateString()}`
                      : `Joined ${memberSince.toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}`}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Member for {daysSinceMember} days</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            {isOwnProfile ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyLink}>
                      {copied ? (
                        <Check className="h-4 w-4 mr-2 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {copied ? "Copied!" : "Copy profile link"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Message button */}
                <Button
                  variant="outline"
                  onClick={onMessage}
                  disabled={!canMessage}
                  title={canMessage ? "" : "Sign in to send direct messages"}
                  className="gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Message</span>
                </Button>

                {/* Friend button */}
                {currentUser && user && (
                  <>
                    {pendingIncoming ? (
                      <Button
                        variant="default"
                        onClick={() => acceptFriendRequest(pendingIncoming.id)}
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        <span className="hidden sm:inline">Accept</span>
                      </Button>
                    ) : isFriend ? (
                      <Button variant="secondary" disabled className="gap-2">
                        <UserCheck className="h-4 w-4" />
                        <span className="hidden sm:inline">Friends</span>
                      </Button>
                    ) : pendingOutgoing ? (
                      <Button variant="secondary" disabled className="gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="hidden sm:inline">Pending</span>
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        onClick={() => sendFriendRequest(profileUser.id)}
                        className="gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add Friend</span>
                      </Button>
                    )}
                  </>
                )}

                {/* More options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyLink}>
                      {copied ? (
                        <Check className="h-4 w-4 mr-2 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {copied ? "Copied!" : "Copy profile link"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
