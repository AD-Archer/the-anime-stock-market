"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  User,
  Share2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    users,
    currentUser,
    getUserPortfolio,
    stocks,
    comments,
    createConversation,
  } = useStore();

  const profileUser = users.find((user) => user.id === id);
  const isOwnProfile = currentUser?.id === profileUser?.id;

  const portfolio = useMemo(() => {
    if (!profileUser) return [];
    return getUserPortfolio(profileUser.id);
  }, [profileUser, getUserPortfolio]);

  const portfolioDetails = useMemo(() => {
    return portfolio
      .map((holding) => {
        const stock = stocks.find((s) => s.id === holding.stockId);
        if (!stock) return null;
        const currentValue = stock.currentPrice * holding.shares;
        return {
          ...holding,
          stock,
          currentValue,
        };
      })
      .filter(Boolean) as Array<
      (typeof portfolio)[number] & {
        stock: (typeof stocks)[number];
        currentValue: number;
      }
    >;
  }, [portfolio, stocks]);

  const netWorth = useMemo(() => {
    if (!profileUser) return 0;
    const holdingsValue = portfolioDetails.reduce(
      (sum, holding) => sum + holding.currentValue,
      0
    );
    return profileUser.balance + holdingsValue;
  }, [profileUser, portfolioDetails]);

  const userComments = useMemo(() => {
    if (!profileUser) return [];
    return comments
      .filter((comment) => comment.userId === profileUser.id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [comments, profileUser]);

  if (!profileUser) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg text-muted-foreground">User not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-8">
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
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  // You could add a toast notification here
                  alert("Profile link copied to clipboard!");
                }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share Profile
              </Button>
              {isOwnProfile ? (
                <Link href="/profile">
                  <Button variant="outline">Manage Profile</Button>
                </Link>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!currentUser || !profileUser) return;

                      // Create conversation and navigate to messages
                      const conversationId = createConversation([
                        currentUser.id,
                        profileUser.id,
                      ]);
                      router.push(`/messages?conversation=${conversationId}`);
                    }}
                    disabled={!currentUser}
                    title={currentUser ? "" : "Sign in to send direct messages"}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Net Worth</p>
              <p className="text-2xl font-bold text-foreground">
                ${netWorth.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cash Balance</p>
              <p className="text-2xl font-bold text-foreground">
                ${profileUser.balance.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Holdings</p>
              <p className="text-2xl font-bold text-foreground">
                {portfolio.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Visibility</CardTitle>
              <CardDescription>
                {profileUser.isPortfolioPublic || isOwnProfile
                  ? "Current holdings (if public) and performance."
                  : "This user has chosen to keep their holdings private."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileUser.isPortfolioPublic || isOwnProfile ? (
                portfolioDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No holdings available.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {portfolioDetails.map((holding) => (
                      <div
                        key={holding.stockId}
                        className="rounded border p-3 flex items-center justify-between"
                      >
                        <div>
                          <Link
                            href={`/character/${holding.stockId}`}
                            className="font-semibold text-foreground hover:underline"
                          >
                            {holding.stock.characterName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {holding.stock.anime}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {holding.shares} shares @ $
                            {holding.averageBuyPrice.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Value</p>
                          <p className="text-lg font-bold">
                            ${holding.currentValue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  Portfolio is private.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Comments</CardTitle>
              <CardDescription>
                Latest comments and replies made by this user.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userComments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No comments yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {userComments.slice(0, 5).map((comment) => {
                    const character = comment.characterId
                      ? stocks.find((s) => s.id === comment.characterId)
                      : null;
                    const destination = comment.characterId
                      ? `/character/${comment.characterId}`
                      : `/anime/${comment.animeId}`;
                    return (
                      <div
                        key={comment.id}
                        className="rounded border p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <Link
                            href={destination}
                            className="font-medium text-foreground hover:underline"
                          >
                            {character
                              ? `${character.characterName} (${character.anime})`
                              : `Anime: ${comment.animeId}`}
                          </Link>
                          <span>
                            {comment.timestamp.toLocaleDateString()}{" "}
                            {comment.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {comment.content}
                        </p>
                        {(comment.tags || []).length > 0 && (
                          <div className="flex gap-2">
                            {comment.tags?.map((tag) => (
                              <Badge
                                key={`${comment.id}-${tag}`}
                                variant={
                                  tag === "nsfw" ? "destructive" : "secondary"
                                }
                              >
                                {tag.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />{" "}
                          {comment.likedBy.length} •{" "}
                          <ThumbsDown className="h-3 w-3" />{" "}
                          {comment.dislikedBy.length}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
