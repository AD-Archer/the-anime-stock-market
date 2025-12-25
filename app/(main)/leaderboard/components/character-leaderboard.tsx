"use client";

import { useState, useMemo } from "react";
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
  Star,
  BarChart3,
  Target,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Stock, PriceHistory } from "@/lib/types";

type CharacterSortType = "best" | "worst" | "popularAnime" | "byAnime";

interface CharacterWithStats extends Stock {
  marketCap: number;
  priceChange: number;
  rank: number;
  animeRank?: number;
}

interface AnimeStats {
  name: string;
  characterCount: number;
  totalMarketCap: number;
  averagePrice: number;
  rank: number;
}

export function CharacterLeaderboard() {
  const { stocks, getStockPriceHistory } = useStore();
  const [sortType, setSortType] = useState<CharacterSortType>("best");
  const [showCount, setShowCount] = useState(25);
  const [selectedAnime, setSelectedAnime] = useState<string>("");

  const charactersWithStats = useMemo(() => {
    return stocks.map((stock): CharacterWithStats => {
      const priceHistory = getStockPriceHistory(stock.id);
      const marketCap = stock.currentPrice * stock.totalShares;

      // Calculate price change
      let priceChange = 0;
      if (priceHistory.length >= 2) {
        const previousPrice = priceHistory[priceHistory.length - 2].price;
        priceChange =
          ((stock.currentPrice - previousPrice) / previousPrice) * 100;
      }

      return {
        ...stock,
        marketCap,
        priceChange,
        rank: 0, // Will be set after sorting
      };
    });
  }, [stocks, getStockPriceHistory]);

  const animeStats = useMemo(() => {
    const animeMap = new Map<
      string,
      { characters: CharacterWithStats[]; totalMarketCap: number }
    >();

    charactersWithStats.forEach((char) => {
      if (!animeMap.has(char.anime)) {
        animeMap.set(char.anime, { characters: [], totalMarketCap: 0 });
      }
      const anime = animeMap.get(char.anime)!;
      anime.characters.push(char);
      anime.totalMarketCap += char.marketCap;
    });

    return Array.from(animeMap.entries())
      .map(
        ([name, data]): AnimeStats => ({
          name,
          characterCount: data.characters.length,
          totalMarketCap: data.totalMarketCap,
          averagePrice: data.totalMarketCap / data.characters.length,
          rank: 0, // Will be set after sorting
        })
      )
      .sort((a, b) => b.characterCount - a.characterCount)
      .map((anime, index) => ({ ...anime, rank: index + 1 }));
  }, [charactersWithStats]);

  const sortedCharacters = useMemo(() => {
    let filtered = charactersWithStats;

    if (sortType === "byAnime" && selectedAnime) {
      filtered = charactersWithStats.filter(
        (char) => char.anime === selectedAnime
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortType) {
        case "best":
          return b.marketCap - a.marketCap;
        case "worst":
          return a.marketCap - b.marketCap;
        case "popularAnime":
          // Sort by anime popularity first, then by market cap within anime
          const animeA = animeStats.find((anime) => anime.name === a.anime);
          const animeB = animeStats.find((anime) => anime.name === b.anime);
          if (animeA && animeB && animeA.rank !== animeB.rank) {
            return animeA.rank - animeB.rank;
          }
          return b.marketCap - a.marketCap;
        case "byAnime":
          return b.marketCap - a.marketCap;
        default:
          return 0;
      }
    });

    // Add ranks
    return sorted.map((character, index) => ({
      ...character,
      rank: index + 1,
    }));
  }, [charactersWithStats, sortType, selectedAnime, animeStats]);

  const displayedCharacters = sortedCharacters.slice(0, showCount);

  const getSortIcon = (type: CharacterSortType) => {
    switch (type) {
      case "best":
        return <Trophy className="h-4 w-4" />;
      case "worst":
        return <Target className="h-4 w-4" />;
      case "popularAnime":
        return <Star className="h-4 w-4" />;
      case "byAnime":
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getSortLabel = (type: CharacterSortType) => {
    switch (type) {
      case "best":
        return "Best Characters";
      case "worst":
        return "Worst Characters";
      case "popularAnime":
        return "Popular Anime";
      case "byAnime":
        return "By Anime";
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return null;
  };

  const renderCharacterItem = (character: CharacterWithStats) => {
    const isPositive = character.priceChange > 0;
    const isNegative = character.priceChange < 0;

    return (
      <Link
        key={character.id}
        href={`/character/${character.characterSlug || character.id}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border p-4 transition-all hover:bg-muted hover:shadow-md">
          {/* Rank and Image */}
          <div className="flex items-center gap-4 sm:w-auto">
            <div className="flex w-12 items-center justify-center">
              {getRankIcon(character.rank) || (
                <span className="text-2xl font-bold text-muted-foreground">
                  {character.rank}
                </span>
              )}
            </div>
            <div className="relative h-16 w-16 overflow-hidden rounded-lg flex-shrink-0">
              <Image
                src={character.imageUrl || "/placeholder.svg"}
                alt={character.characterName}
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Character Info and Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-bold text-foreground">
                  {character.characterName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {character.anime}
                </p>
              </div>

              {/* Price and Change */}
              <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
                <p className="text-xl font-bold text-foreground">
                  ${character.currentPrice.toFixed(2)}
                </p>
                <div className="flex items-center justify-end gap-1">
                  {isPositive && (
                    <TrendingUp className="h-3 w-3 text-primary" />
                  )}
                  {isNegative && (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      isPositive
                        ? "text-primary"
                        : isNegative
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {isPositive && "+"}
                    {character.priceChange.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Market Cap and Shares - Mobile stacked */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2 pt-2 border-t border-border sm:border-0 sm:pt-0">
              <div className="text-sm">
                <p className="text-muted-foreground">Market Cap</p>
                <p className="font-mono font-semibold text-foreground">
                  ${character.marketCap.toFixed(2)}
                </p>
              </div>
              <Badge variant="secondary" className="self-start sm:self-auto">
                {character.availableShares.toLocaleString()} /{" "}
                {character.totalShares.toLocaleString()}
              </Badge>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  const renderAnimeItem = (anime: AnimeStats) => {
    const topCharacter = charactersWithStats
      .filter((char) => char.anime === anime.name)
      .sort((a, b) => b.marketCap - a.marketCap)[0];

    return (
      <div
        key={anime.name}
        className="flex items-center gap-4 rounded-lg border p-4"
      >
        {/* Rank */}
        <div className="flex w-12 items-center justify-center">
          {getRankIcon(anime.rank) || (
            <span className="text-2xl font-bold text-muted-foreground">
              {anime.rank}
            </span>
          )}
        </div>

        {/* Anime Image (use top character's image) */}
        <div className="relative h-16 w-16 overflow-hidden rounded-lg flex-shrink-0">
          <Image
            src={topCharacter?.imageUrl || "/placeholder.svg"}
            alt={anime.name}
            fill
            className="object-cover"
          />
        </div>

        {/* Anime Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground">{anime.name}</h3>
          <p className="text-sm text-muted-foreground">
            {anime.characterCount} character
            {anime.characterCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Stats */}
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">
            $
            {anime.totalMarketCap.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="text-xs text-muted-foreground">Total Market Cap</p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Character Rankings
            </CardTitle>
            <CardDescription>
              Discover the best and worst performing characters
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select
              value={sortType}
              onValueChange={(value: CharacterSortType) => setSortType(value)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Best Characters
                  </div>
                </SelectItem>
                <SelectItem value="worst">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Worst Characters
                  </div>
                </SelectItem>
                <SelectItem value="popularAnime">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Popular Anime
                  </div>
                </SelectItem>
                <SelectItem value="byAnime">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    By Anime
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {sortType === "byAnime" && (
              <Select value={selectedAnime} onValueChange={setSelectedAnime}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select Anime" />
                </SelectTrigger>
                <SelectContent>
                  {animeStats.map((anime) => (
                    <SelectItem key={anime.name} value={anime.name}>
                      {anime.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortType === "popularAnime"
            ? animeStats.slice(0, showCount).map(renderAnimeItem)
            : displayedCharacters.map(renderCharacterItem)}
        </div>

        {/* Show More Button */}
        {showCount <
          (sortType === "popularAnime"
            ? animeStats.length
            : sortedCharacters.length) && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={() => setShowCount(Math.min(showCount + 25, 100))}
            >
              Show More (
              {Math.min(
                showCount + 25,
                sortType === "popularAnime"
                  ? animeStats.length
                  : sortedCharacters.length
              )}{" "}
              of{" "}
              {sortType === "popularAnime"
                ? animeStats.length
                : sortedCharacters.length}
              )
            </Button>
          </div>
        )}

        {displayedCharacters.length === 0 && sortType !== "popularAnime" && (
          <p className="py-12 text-center text-muted-foreground">
            No characters found
          </p>
        )}

        {animeStats.length === 0 && sortType === "popularAnime" && (
          <p className="py-12 text-center text-muted-foreground">
            No anime data available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
