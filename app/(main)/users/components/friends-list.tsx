"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserAvatarUrl, getUserInitials } from "@/lib/avatar";
import { getUserProfileHref } from "@/lib/user-profile";
import type { User } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Users, Crown } from "lucide-react";

export function FriendsList() {
  const { currentUser, friends, users } = useStore();
  if (!currentUser) return null;

  const friendRelationships = friends.filter(
    (f) =>
      f.status === "accepted" &&
      (f.requesterId === currentUser.id || f.receiverId === currentUser.id)
  );
  const friendEntries = friendRelationships
    .map((relationship) => {
      const friendId =
        relationship.requesterId === currentUser.id
          ? relationship.receiverId
          : relationship.requesterId;
      const friendUser = users.find((user) => user.id === friendId);
      if (!friendUser) return null;
      return {
        user: friendUser,
        since: relationship.respondedAt ?? relationship.createdAt,
      };
    })
    .filter(Boolean) as Array<{ user: User; since: Date }>;

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Friends</h2>
          {friendEntries.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {friendEntries.length}
            </Badge>
          )}
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {friendEntries.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No friends yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add friends to connect and see their activity
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {friendEntries.map(({ user, since }) => (
              <Link
                key={user.id}
                href={getUserProfileHref(user, user.id)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-all"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={getUserAvatarUrl(user)}
                      alt={user.displayName || user.username}
                    />
                    <AvatarFallback>
                      {getUserInitials(user.displayName || user.username)}
                    </AvatarFallback>
                  </Avatar>
                  {user.premiumMeta?.isPremium && (
                    <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-purple-500 rounded-full">
                      <Crown className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                      {user.displayName || user.username}
                    </span>
                    {user.isAdmin && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0"
                      >
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Friends since{" "}
                    {since.toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
