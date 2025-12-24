"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { getUserProfileHref } from "@/lib/user-profile";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Medal,
  Award,
  Crown,
  Users,
  DollarSign,
  Activity,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { User, Portfolio, Transaction } from "@/lib/types";

type PlayerSortType = "richest" | "mostStocks" | "mostActive" | "longestMember";

interface PlayerWithStats extends User {
  portfolioValue: number;
  totalStocks: number;
  transactionCount: number;
  rank: number;
}

export function PlayerLeaderboard() {
  const { users, portfolios, transactions, stocks } = useStore();
  const { user: currentUser } = useAuth();
  const [sortType, setSortType] = useState<PlayerSortType>("richest");
  const [showCount, setShowCount] = useState(25);

  const playersWithStats = useMemo(() => {
    return users.map((user): PlayerWithStats => {
      // Calculate portfolio value
      const userPortfolios = portfolios.filter((p) => p.userId === user.id);
      const portfolioValue = userPortfolios.reduce((total, portfolio) => {
        const stock = stocks.find((s) => s.id === portfolio.stockId);
        return total + (stock ? stock.currentPrice * portfolio.shares : 0);
      }, 0);

      // Calculate total stocks owned
      const totalStocks = userPortfolios.reduce(
        (total, p) => total + p.shares,
        0
      );

      // Calculate transaction count
      const transactionCount = transactions.filter(
        (t) => t.userId === user.id
      ).length;

      return {
        ...user,
        portfolioValue,
        totalStocks,
        transactionCount,
        rank: 0, // Will be set after sorting
      };
    });
  }, [users, portfolios, transactions, stocks]);

  const sortedPlayers = useMemo(() => {
    const sorted = [...playersWithStats].sort((a, b) => {
      switch (sortType) {
        case "richest":
          return b.portfolioValue - a.portfolioValue;
        case "mostStocks":
          return b.totalStocks - a.totalStocks;
        case "mostActive":
          return b.transactionCount - a.transactionCount;
        case "longestMember":
          return a.createdAt.getTime() - b.createdAt.getTime();
        default:
          return 0;
      }
    });

    // Add ranks
    return sorted.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
  }, [playersWithStats, sortType]);

  const currentUserRank = sortedPlayers.find(
    (p) => p.id === currentUser?.id
  )?.rank;
  const displayedPlayers = sortedPlayers.slice(0, showCount);

  const getSortIcon = (type: PlayerSortType) => {
    switch (type) {
      case "richest":
        return <DollarSign className="h-4 w-4" />;
      case "mostStocks":
        return <Trophy className="h-4 w-4" />;
      case "mostActive":
        return <Activity className="h-4 w-4" />;
      case "longestMember":
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getSortLabel = (type: PlayerSortType) => {
    switch (type) {
      case "richest":
        return "Richest";
      case "mostStocks":
        return "Most Stocks";
      case "mostActive":
        return "Most Active";
      case "longestMember":
        return "Longest Member";
    }
  };

  const getValueDisplay = (player: PlayerWithStats) => {
    switch (sortType) {
      case "richest":
        return `$${player.portfolioValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      case "mostStocks":
        return `${player.totalStocks.toLocaleString()} shares`;
      case "mostActive":
        return `${player.transactionCount} trades`;
      case "longestMember":
        return player.createdAt.toLocaleDateString();
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Players
            </CardTitle>
            <CardDescription>
              Leaderboard of the most successful traders
            </CardDescription>
          </div>
          <Select
            value={sortType}
            onValueChange={(value: PlayerSortType) => setSortType(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="richest">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Richest
                </div>
              </SelectItem>
              <SelectItem value="mostStocks">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Most Stocks
                </div>
              </SelectItem>
              <SelectItem value="mostActive">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Most Active
                </div>
              </SelectItem>
              <SelectItem value="longestMember">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Longest Member
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Current User Rank */}
        {currentUser && currentUserRank && currentUserRank > showCount && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground">
              Your rank:{" "}
              <span className="font-semibold text-foreground">
                #{currentUserRank}
              </span>{" "}
              -{" "}
              {getValueDisplay(
                sortedPlayers.find((p) => p.id === currentUser.id)!
              )}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {displayedPlayers.map((player) => {
            const isCurrentUser = player.id === currentUser?.id;

            return (
              <div
                key={player.id}
                className={`flex items-center gap-4 rounded-lg border p-4 transition-all hover:bg-muted hover:shadow-md ${
                  isCurrentUser ? "bg-primary/5 border-primary/20" : ""
                }`}
              >
                {/* Rank */}
                <div className="flex w-12 items-center justify-center">
                  {getRankIcon(player.rank) || (
                    <span
                      className={`text-2xl font-bold ${
                        isCurrentUser ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {player.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className="relative h-12 w-12 overflow-hidden rounded-full flex-shrink-0 bg-muted">
                  <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
                    {(player.displayName || player.username).charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={getUserProfileHref(player, player.id)}>
                      <h3
                        className={`font-bold truncate hover:underline cursor-pointer ${
                          isCurrentUser ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {player.displayName || player.username}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs">(You)</span>
                        )}
                      </h3>
                    </Link>
                    {player.isAdmin && (
                      <Badge variant="secondary" className="text-xs">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Balance: $
                    {player.balance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>

                {/* Value */}
                <div className="text-right">
                  <p
                    className={`text-lg font-bold ${
                      isCurrentUser ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {getValueDisplay(player)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getSortLabel(sortType)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show More Button */}
        {showCount < sortedPlayers.length && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={() => setShowCount(Math.min(showCount + 25, 100))}
            >
              Show More ({Math.min(showCount + 25, sortedPlayers.length)} of{" "}
              {sortedPlayers.length})
            </Button>
          </div>
        )}

        {displayedPlayers.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            No players found
          </p>
        )}
      </CardContent>
    </Card>
  );
}
