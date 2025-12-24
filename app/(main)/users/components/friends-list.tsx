"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";

export function FriendsList() {
  const { currentUser, getUserFriends } = useStore();
  if (!currentUser) return null;

  const friends = getUserFriends(currentUser.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Friends</CardTitle>
      </CardHeader>
      <CardContent>
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No friends yet.</p>
        ) : (
          <ul className="space-y-2">
            {friends.map((u) => (
              <li key={u.id} className="flex justify-between items-center">
                <Link
                  href={`/users/${u.id}`}
                  className="text-sm hover:underline"
                >
                  {u.username}
                </Link>
                <span className="text-xs text-muted-foreground">
                  Joined {u.createdAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
