"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, ExternalLink } from "lucide-react";
import type { CharacterSuggestion } from "@/lib/types";

type Decision = "approve" | "deny" | null;

const parseAnilistUrl = (
  url?: string
): { id: number; type: "anime" | "character" } | null => {
  if (!url) return null;
  const match = url.match(/anilist\.co\/(anime|character)\/(\d+)/i);
  if (!match) return null;
  return { id: Number.parseInt(match[2], 10), type: match[1] as any };
};

export function CharacterSuggestions() {
  const {
    characterSuggestions,
    getCharacterSuggestions,
    reviewCharacterSuggestion,
    currentUser,
    refreshStocks,
    stocks,
  } = useStore();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<
    CharacterSuggestion["status"] | "all"
  >("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CharacterSuggestion | null>(null);
  const [decision, setDecision] = useState<Decision>(null);
  const [notes, setNotes] = useState("");
  const [autoImportEnabled, setAutoImportEnabled] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await getCharacterSuggestions({ status: statusFilter });
      } finally {
        setLoading(false);
      }
    })();
  }, [getCharacterSuggestions, statusFilter]);

  const filteredSuggestions = useMemo(() => {
    return characterSuggestions
      .filter((s) =>
        statusFilter === "all" ? true : s.status === statusFilter
      )
      .filter((s) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.characterName.toLowerCase().includes(q) ||
          s.anime.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
  }, [characterSuggestions, statusFilter, searchQuery]);

  const openDecision = (suggestion: CharacterSuggestion, next: Decision) => {
    setSelected(suggestion);
    setDecision(next);
    setNotes("");
    setAutoImportEnabled(Boolean(suggestion.anilistUrl));
  };

  const attemptAutoImport = async (
    suggestion: CharacterSuggestion
  ): Promise<{
    status: CharacterSuggestion["autoImportStatus"];
    message: string;
    stockId?: string;
  }> => {
    if (!suggestion.anilistUrl || !autoImportEnabled) {
      return {
        status: "not_requested",
        message: "Auto import skipped",
        stockId: suggestion.stockId,
      };
    }

    if (!currentUser?.isAdmin) {
      return {
        status: "failed",
        message: "Only admins can auto-import AniList links.",
        stockId: suggestion.stockId,
      };
    }

    const parsed = parseAnilistUrl(suggestion.anilistUrl);
    if (!parsed) {
      return {
        status: "failed",
        message: "Invalid AniList URL",
        stockId: suggestion.stockId,
      };
    }

    const params = new URLSearchParams();
    params.set("type", parsed.type);
    params.set("id", String(parsed.id));
    params.set("userId", currentUser.id);

    const existing =
      parsed.type === "character"
        ? stocks.find((s) => s.anilistCharacterId === parsed.id)
        : null;

    if (existing) {
      return {
        status: "succeeded",
        message: `${existing.characterName} already exists.`,
        stockId: existing.id,
      };
    }

    try {
      const res = await fetch(`/api/admin/add-stocks?${params.toString()}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        return {
          status: "failed",
          message: data.error || "Failed to import from AniList",
          stockId: suggestion.stockId,
        };
      }

      const firstAddedId =
        data?.result?.results?.find((r: any) => r?.added && r.id)?.id ||
        suggestion.stockId;
      await refreshStocks();
      return {
        status: "succeeded",
        message:
          data?.result?.added > 0
            ? `Imported ${data.result.added} stock(s) from AniList`
            : "AniList import completed",
        stockId: firstAddedId,
      };
    } catch (err: any) {
      return {
        status: "failed",
        message:
          err?.message || "Unexpected error while importing from AniList",
        stockId: suggestion.stockId,
      };
    }
  };

  const handleDecision = async () => {
    if (!selected || !decision) return;
    setProcessingId(selected.id);
    try {
      let autoImportStatus: CharacterSuggestion["autoImportStatus"] | undefined =
        "not_requested";
      let autoImportMessage: string | undefined;
      let stockId: string | undefined = selected.stockId;

      if (decision === "approve") {
        const autoImport = await attemptAutoImport(selected);
        autoImportStatus = autoImport.status;
        autoImportMessage = autoImport.message;
        stockId = autoImport.stockId;
      }

      await reviewCharacterSuggestion(
        selected.id,
        decision === "approve" ? "approved" : "denied",
        {
          notes,
          stockId,
          autoImportStatus,
          autoImportMessage,
        }
      );

      toast({
        title:
          decision === "approve"
            ? "Suggestion approved"
            : "Suggestion denied",
        description:
          decision === "approve"
            ? "User has been notified and the stock will be added if possible."
            : "User has been notified of the decision.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update suggestion";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
      setSelected(null);
      setDecision(null);
      setNotes("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-foreground">
            Character Suggestions
          </h3>
          <p className="text-sm text-muted-foreground">
            Approve or deny user submissions. Approving with a valid AniList
            link will auto-import the stock.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search suggestions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as CharacterSuggestion["status"] | "all"
              )
            }
            className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
          <Button
            variant="outline"
            onClick={async () => {
              setLoading(true);
              try {
                await getCharacterSuggestions({ status: statusFilter });
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading suggestions…</p>
          </CardContent>
        </Card>
      ) : filteredSuggestions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No suggestions match the current filters.
          </CardContent>
        </Card>
      ) : (
        filteredSuggestions.map((suggestion) => (
          <Card key={suggestion.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <span>{suggestion.characterName}</span>
                  <Badge
                    variant={
                      suggestion.status === "approved"
                        ? "default"
                        : suggestion.status === "pending"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {suggestion.status}
                  </Badge>
                  {suggestion.autoImportStatus &&
                    suggestion.autoImportStatus !== "not_requested" && (
                      <Badge
                        variant={
                          suggestion.autoImportStatus === "succeeded"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {suggestion.autoImportStatus}
                      </Badge>
                    )}
                  {suggestion.priority && (
                    <Badge variant="destructive" className="text-xs">
                      Priority
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm">
                  {suggestion.anime}
                </CardDescription>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>
                  Submitted {suggestion.createdAt.toLocaleString()}
                </div>
                {suggestion.reviewedAt && (
                  <div>
                    Reviewed {suggestion.reviewedAt.toLocaleString()}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestion.description && (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {suggestion.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm">
                {suggestion.anilistUrl && (
                  <Link
                    href={suggestion.anilistUrl}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    AniList link
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
                {suggestion.stockId && (
                  <span className="text-muted-foreground">
                    Stock ID: {suggestion.stockId}
                  </span>
                )}
                {suggestion.anilistUrl &&
                  parseAnilistUrl(suggestion.anilistUrl)?.type ===
                    "character" && (
                    (() => {
                      const parsed = parseAnilistUrl(suggestion.anilistUrl);
                      const existing =
                        parsed?.type === "character"
                          ? stocks.find(
                              (s) => s.anilistCharacterId === parsed.id
                            )
                          : null;
                      return (
                        existing && (
                          <Badge variant="outline">
                            Exists: {existing.characterName}
                          </Badge>
                        )
                      );
                    })()
                  )}
                {suggestion.resolutionNotes && (
                  <span className="text-muted-foreground">
                    Notes: {suggestion.resolutionNotes}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => openDecision(suggestion, "approve")}
                  disabled={
                    processingId === suggestion.id ||
                    suggestion.status !== "pending"
                  }
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {processingId === suggestion.id &&
                  decision === "approve" ? (
                    "Approving..."
                  ) : (
                    "Approve"
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDecision(suggestion, "deny")}
                  disabled={
                    processingId === suggestion.id ||
                    suggestion.status !== "pending"
                  }
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  {processingId === suggestion.id && decision === "deny"
                    ? "Denying..."
                    : "Deny"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={Boolean(selected && decision)} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "approve" ? "Approve suggestion" : "Deny suggestion"}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{selected.characterName}</p>
                <p className="text-muted-foreground">{selected.anime}</p>
              </div>

              {selected.anilistUrl && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoImportEnabled}
                    onChange={(e) => setAutoImportEnabled(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Attempt auto-import from AniList link
                </label>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Admin notes (optional)</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add context for the user..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelected(null);
                setDecision(null);
                setNotes("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleDecision} disabled={processingId === selected?.id}>
              {processingId === selected?.id ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
