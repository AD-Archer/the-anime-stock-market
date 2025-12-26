"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface RateLimitStatus {
  requestsUsed: number;
  requestsRemaining: number;
  totalRequestsAllowed: number;
  timeUntilReset: number;
  windowStartTime: number;
}

interface ImportResult {
  added?: number;
  updated?: number;
  failed?: number;
  charactersFound?: number;
  totalAdded?: number;
  totalUpdated?: number;
  totalFailed?: number;
}

type ImportType = "anime" | "character" | "search";

export function StockImporter() {
  const [type, setType] = useState<ImportType>("anime");
  const [id, setId] = useState("");
  const [search, setSearch] = useState("");
  const [characterNameFilter, setCharacterNameFilter] = useState("");
  const [minRole, setMinRole] = useState<"MAIN" | "SUPPORTING" | "BACKGROUND">(
    "MAIN"
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const { toast } = useToast();

  // Fetch rate limit status on mount
  useEffect(() => {
    fetchRateLimit();
    const interval = setInterval(fetchRateLimit, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  async function fetchRateLimit() {
    try {
      const response = await fetch("/api/admin/add-stocks");
      if (response.ok) {
        const data = await response.json();
        setRateLimit(data.rateLimit);
      }
    } catch (err) {
      console.warn("Failed to fetch rate limit:", err);
    }
  }

  async function handleImport() {
    setLoading(true);
    setResult(null);

    try {
      const params = new URLSearchParams();
      params.set("type", type);

      if (type === "anime" || type === "character") {
        if (!id) {
          toast({
            variant: "destructive",
            title: "ID is required",
          });
          setLoading(false);
          return;
        }
        params.set("id", id);
      } else if (type === "search") {
        if (!search) {
          toast({
            variant: "destructive",
            title: "Search query is required",
          });
          setLoading(false);
          return;
        }
        params.set("search", search);
      }

      if (type === "anime" && characterNameFilter) {
        params.set("characterNameFilter", characterNameFilter);
      }

      if (type === "anime") {
        params.set("minRole", minRole);
      }

      const response = await fetch(
        `/api/admin/add-stocks?${params.toString()}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Failed to import stocks",
          description: data.error,
        });
      } else {
        setResult(data.result);
        setRateLimit(data.rateLimit);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "An error occurred during import",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
      fetchRateLimit();
    }
  }

  const rateLimitPercentage =
    rateLimit && rateLimit.totalRequestsAllowed > 0
      ? (rateLimit.requestsUsed / rateLimit.totalRequestsAllowed) * 100
      : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-bold">Stock Importer</h2>

        {/* Rate Limit Display */}
        {rateLimit && (
          <div className="mb-6 rounded-lg bg-slate-100 p-4">
            <div className="mb-2 flex justify-between text-sm font-semibold">
              <span>
                Rate Limit: {rateLimit.requestsUsed}/
                {rateLimit.totalRequestsAllowed}
              </span>
              <span className="text-xs text-slate-600">
                Reset in {Math.floor(rateLimit.timeUntilReset / 1000)}s
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-300">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${rateLimitPercentage}%` }}
              />
            </div>
            {rateLimit.requestsRemaining === 0 && (
              <p className="mt-2 text-xs text-red-600 font-semibold">
                Rate limit exceeded. Please wait for reset.
              </p>
            )}
          </div>
        )}

        {/* Type Selection */}
        <div className="mb-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Import Type
            </label>
            <Select
              value={type}
              onValueChange={(val) => setType(val as ImportType)}
            >
              <SelectTrigger suppressHydrationWarning>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anime">
                  Import Anime (all characters)
                </SelectItem>
                <SelectItem value="character">
                  Import Character (all appearances)
                </SelectItem>
                <SelectItem value="search">
                  Search & Import Character
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Anime/Character ID Input */}
          {(type === "anime" || type === "character") && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                AniList {type === "anime" ? "Anime" : "Character"} ID
              </label>
              <Input
                type="number"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder={`Enter AniList ${type} ID`}
              />
            </div>
          )}

          {/* Search Input */}
          {type === "search" && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Character Name
              </label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for character name"
              />
            </div>
          )}

          {/* Anime-specific options */}
          {type === "anime" && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Character Name Filter (optional)
                </label>
                <Input
                  value={characterNameFilter}
                  onChange={(e) => setCharacterNameFilter(e.target.value)}
                  placeholder="Filter by partial name (e.g., 'Tanjiro')"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Minimum Character Role
                </label>
                <Select
                  value={minRole}
                  onValueChange={(val) => setMinRole(val as any)}
                >
                  <SelectTrigger suppressHydrationWarning>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAIN">Main Characters</SelectItem>
                    <SelectItem value="SUPPORTING">
                      Main + Supporting
                    </SelectItem>
                    <SelectItem value="BACKGROUND">All Characters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Import Button */}
        <Button
          onClick={handleImport}
          disabled={loading || rateLimit?.requestsRemaining === 0}
          className="w-full"
          size="lg"
        >
          {loading ? "Importing..." : "Start Import"}
        </Button>
      </Card>

      {/* Results Display */}
      {result && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold">Import Results</h3>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {result.added !== undefined && (
              <div className="space-y-1">
                <p className="text-sm text-slate-600">New Stocks</p>
                <p className="text-2xl font-bold text-green-600">
                  {result.added}
                </p>
              </div>
            )}

            {result.charactersFound !== undefined && (
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Characters Found</p>
                <p className="text-2xl font-bold">{result.charactersFound}</p>
              </div>
            )}

            {result.updated !== undefined && (
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Updated</p>
                <p className="text-2xl font-bold text-blue-600">
                  {result.updated}
                </p>
              </div>
            )}

            {result.failed !== undefined && (
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Failed</p>
                <p className="text-2xl font-bold text-orange-600">
                  {result.failed}
                </p>
              </div>
            )}

            {result.totalAdded !== undefined && (
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Total Added</p>
                <p className="text-2xl font-bold text-green-600">
                  {result.totalAdded}
                </p>
              </div>
            )}

            {result.totalUpdated !== undefined && (
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Total Updated</p>
                <p className="text-2xl font-bold text-blue-600">
                  {result.totalUpdated}
                </p>
              </div>
            )}

            {result.totalFailed !== undefined && (
              <div className="space-y-1">
                <p className="text-sm text-slate-600">Total Failed</p>
                <p className="text-2xl font-bold text-orange-600">
                  {result.totalFailed}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-600">
              Results from{" "}
              {type === "search"
                ? "character search and addition"
                : type === "anime"
                ? "anime character import"
                : "character appearance import"}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
