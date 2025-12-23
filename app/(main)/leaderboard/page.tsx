"use client";

import { LeaderboardTabs } from "./components/leaderboard-tabs";

export default function LeaderboardPage() {
  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-foreground">
            Leaderboards
          </h1>
          <p className="text-muted-foreground">
            Discover the top players and characters in the anime stock market
          </p>
        </div>

        <LeaderboardTabs />
      </div>
    </div>
  );
}
