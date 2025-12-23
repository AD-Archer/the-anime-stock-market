"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerLeaderboard } from "./player-leaderboard";
import { CharacterLeaderboard } from "./character-leaderboard";
import { Users, BarChart3 } from "lucide-react";

export function LeaderboardTabs() {
  return (
    <Tabs defaultValue="characters" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="characters" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Characters
        </TabsTrigger>
        <TabsTrigger value="players" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Players
        </TabsTrigger>
      </TabsList>

      <TabsContent value="characters" className="mt-6">
        <CharacterLeaderboard />
      </TabsContent>

      <TabsContent value="players" className="mt-6">
        <PlayerLeaderboard />
      </TabsContent>
    </Tabs>
  );
}