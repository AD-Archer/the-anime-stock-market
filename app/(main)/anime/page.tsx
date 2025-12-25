"use client";

import { useStore } from "@/lib/store";
import { generateAnimeSlug } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatCurrencyCompact } from "@/lib/utils";

export default function AnimePage() {
  const { stocks } = useStore();
  const [searchQuery, setSearchQuery] = useState("");

  // Group stocks by anime
  const animeMap = new Map<string, typeof stocks>();
  stocks.forEach((stock) => {
    const animeId = generateAnimeSlug(stock.anime);
    if (!animeMap.has(animeId)) {
      animeMap.set(animeId, []);
    }
    animeMap.get(animeId)!.push(stock);
  });

  // Convert to array and filter by search
  const animeList = Array.from(animeMap.entries())
    .map(([animeId, characters]) => ({
      id: animeId,
      name: characters[0].anime,
      characters,
      totalMarketCap: characters.reduce(
        (sum, char) => sum + char.currentPrice * char.totalShares,
        0
      ),
    }))
    .filter((anime) =>
      anime.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.totalMarketCap - a.totalMarketCap);

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-foreground">
            Anime Series
          </h1>
          <p className="text-muted-foreground">
            Browse characters by anime and join the discussion
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search anime series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Anime Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {animeList.map((anime) => (
            <Link key={anime.id} href={`/anime/${anime.id}`}>
              <Card className="transition-all hover:shadow-lg">
                <CardHeader>
                  <CardTitle>{anime.name}</CardTitle>
                  <CardDescription>
                    {anime.characters.length} characters available
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {anime.characters.slice(0, 5).map((char) => (
                      <Badge key={char.id} variant="secondary">
                        {char.characterName}
                      </Badge>
                    ))}
                    {anime.characters.length > 5 && (
                      <Badge variant="outline">
                        +{anime.characters.length - 5} more
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Market Cap
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      {formatCurrencyCompact(anime.totalMarketCap)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {animeList.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            No anime series found matching your search
          </p>
        )}
      </div>
    </div>
  );
}
