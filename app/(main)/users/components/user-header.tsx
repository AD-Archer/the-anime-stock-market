"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, User, MessageSquare, Settings } from "lucide-react";
import type { User as StoreUser } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";

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
  const {
    currentUser,
    sendFriendRequest,
    friends,
    getPendingFriendRequests,
    acceptFriendRequest,
  } = useStore();
  const { user } = useAuth();
  const isFriend = !!friends.find(
    (f) =>
      f.status === "accepted" &&
      ((f.requesterId === currentUser?.id && f.receiverId === profileUser.id) ||
        (f.requesterId === profileUser.id && f.receiverId === currentUser?.id))
  );
  const pendingIncoming = getPendingFriendRequests(currentUser?.id || "").find(
    (f) => f.requesterId === profileUser.id
  );
  const pendingOutgoing = friends.find(
    (f) =>
      f.status === "pending" &&
      f.requesterId === currentUser?.id &&
      f.receiverId === profileUser.id
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-3xl text-foreground">
              {profileUser.username}
            </CardTitle>
            <CardDescription>
              Member since{" "}
              {new Date(profileUser.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share Profile
          </Button>
          {isOwnProfile ? (
            <Button variant="outline" onClick={onToggleSettings}>
              <Settings className="mr-2 h-4 w-4" />
              {isSettingsOpen ? "Hide Settings" : "Edit Profile"}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onMessage}
                disabled={!canMessage}
                title={canMessage ? "" : "Sign in to send direct messages"}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Message
              </Button>
              {currentUser &&
                user &&
                (pendingIncoming ? (
                  <Button
                    variant="default"
                    onClick={() => acceptFriendRequest(pendingIncoming.id)}
                    title="Accept friend request"
                  >
                    Accept Friend
                  </Button>
                ) : isFriend ? (
                  <Button variant="secondary" disabled>
                    Friends
                  </Button>
                ) : pendingOutgoing ? (
                  <Button variant="secondary" disabled>
                    Request Sent
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => sendFriendRequest(profileUser.id)}
                    title={currentUser ? "" : "Sign in to add friends"}
                  >
                    Add Friend
                  </Button>
                ))}
            </>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
