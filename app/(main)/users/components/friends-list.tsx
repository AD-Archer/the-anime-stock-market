"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserAvatarUrl, getUserInitials } from "@/lib/avatar";
import { getUserProfileHref } from "@/lib/user-profile";
import type { User } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";

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
    <Card>
      <CardHeader>
        <CardTitle>Friends</CardTitle>
      </CardHeader>
      <CardContent>
        {friendEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No friends yet.</p>
        ) : (
          <ul className="space-y-2">
            {friendEntries.map(({ user, since }) => (
              <li key={user.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={getUserAvatarUrl(user)}
                      alt={user.displayName || user.username}
                    />
                    <AvatarFallback>
                      {getUserInitials(user.displayName || user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <Link
                      href={getUserProfileHref(user, user.id)}
                      className="text-sm hover:underline"
                    >
                      {user.displayName || user.username}
                    </Link>
                    {user.isAdmin && <Badge variant="secondary">Admin</Badge>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  Friends since {since.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
