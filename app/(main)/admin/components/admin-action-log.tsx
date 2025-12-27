"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AdminActionType } from "@/lib/types";
import { ChevronDown } from "lucide-react";

const actionLabels: Record<AdminActionType, string> = {
  money_grant: "Added Funds",
  money_withdrawal: "Removed Funds",
  stock_grant: "Granted Stocks",
  stock_removal: "Removed Stocks",
  stock_creation: "Created Stocks",
  ban: "Ban",
  unban: "Unban",
  deletion_scheduled: "Deletion Scheduled",
  deletion_finalized: "Deletion Finalized",
  support_update: "Support Ticket",
  kill_switch: "Kill Switch",
};

const badgeVariants: Record<
  AdminActionType,
  "default" | "secondary" | "outline" | "destructive"
> = {
  money_grant: "default",
  money_withdrawal: "outline",
  stock_grant: "default",
  stock_removal: "outline",
  stock_creation: "default",
  ban: "destructive",
  unban: "secondary",
  deletion_scheduled: "secondary",
  deletion_finalized: "destructive",
  support_update: "secondary",
  kill_switch: "destructive",
};

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Helper function to format metadata for display
function formatMetadataForDisplay(
  metadata: any,
  action: AdminActionType,
  stocks: any[]
): { displayLines: Array<{ label: string; value: string }>; rawData: any } {
  if (!metadata) {
    return { displayLines: [], rawData: {} };
  }

  const displayLines: Array<{ label: string; value: string }> = [];

  // Helper to get stock info by ID
  const getStockInfo = (stockId: string) => {
    return stocks.find((stock) => stock.id === stockId);
  };

  // Stock-related actions
  if (
    action === "stock_creation" ||
    action === "stock_grant" ||
    action === "stock_removal"
  ) {
    let characterName = metadata.characterName;
    let anime = metadata.anime;

    // If we don't have character name in metadata, try to look it up from stockId
    if (!characterName && metadata.stockId) {
      const stock = getStockInfo(metadata.stockId);
      if (stock) {
        characterName = stock.characterName;
        anime = stock.anime;
      }
    }

    if (characterName) {
      displayLines.push({
        label: "Character",
        value: `${characterName}${anime ? ` (${anime})` : ""}`,
      });
    }
    if (metadata.initialPrice) {
      displayLines.push({
        label: "Price",
        value: `$${metadata.initialPrice.toFixed(2)}`,
      });
    }
    if (metadata.shares !== undefined) {
      displayLines.push({ label: "Shares", value: metadata.shares.toString() });
    }
    if (metadata.newShareCount !== undefined) {
      displayLines.push({
        label: "New Share Count",
        value: metadata.newShareCount.toString(),
      });
    }
    if (metadata.totalNewShares !== undefined) {
      displayLines.push({
        label: "Total New Shares",
        value: metadata.totalNewShares.toString(),
      });
    }
    if (metadata.price !== undefined) {
      displayLines.push({
        label: "Price",
        value: `$${metadata.price.toFixed(2)}`,
      });
    }
    if (metadata.newPrice !== undefined) {
      displayLines.push({
        label: "New Price",
        value: `$${metadata.newPrice.toFixed(2)}`,
      });
    }
  }

  // Money actions
  if (action === "money_grant" || action === "money_withdrawal") {
    if (metadata.amount) {
      displayLines.push({
        label: "Amount",
        value: `$${metadata.amount.toFixed(2)}`,
      });
    }
  }

  // Ban/Unban actions
  if (action === "ban" || action === "unban") {
    if (metadata.duration) {
      displayLines.push({ label: "Duration", value: metadata.duration });
    }
    if (metadata.banUntil) {
      displayLines.push({
        label: "Ban Until",
        value: new Date(metadata.banUntil).toLocaleString(),
      });
    }
  }

  // Market actions
  if (metadata.percentage !== undefined) {
    displayLines.push({
      label: "Percentage",
      value: `${metadata.percentage}%`,
    });
  }
  if (metadata.multiplier !== undefined) {
    displayLines.push({
      label: "Multiplier",
      value: metadata.multiplier.toString(),
    });
  }

  // Action type
  if (metadata.action) {
    displayLines.push({
      label: "Action Type",
      value: metadata.action.replace(/_/g, " "),
    });
  }

  return { displayLines, rawData: metadata };
}

export function AdminActionLogPanel() {
  const { adminActionLogs, users, stocks } = useStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [selectedActions, setSelectedActions] = useState<Set<string>>(
    new Set()
  );
  const [performedInput, setPerformedInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [dateStart, setDateStart] = useState<string | null>(null);
  const [dateEnd, setDateEnd] = useState<string | null>(null);

  // URL-based pagination
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? parseInt(pageParam, 10) : 1;
  });
  const [limit, setLimit] = useState(() => {
    const limitParam = searchParams.get("limit");
    return limitParam ? parseInt(limitParam, 10) : 50;
  });

  // Update URL when page or limit changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentPage = params.get("page");
    const currentLimit = params.get("limit");

    const newPage = page.toString();
    const newLimit = limit.toString();

    // Only update URL if parameters actually changed
    if (currentPage !== newPage || currentLimit !== newLimit) {
      params.set("page", newPage);
      params.set("limit", newLimit);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, [page, limit]);

  const entries = useMemo(
    () =>
      [...adminActionLogs].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      ),
    [adminActionLogs]
  );

  const resolveUser = (userId: string) =>
    users.find((user) => user.id === userId)?.username || "Unknown";

  const normalizedQuery = query.trim().toLowerCase();

  const parseList = (input: string) =>
    input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase());

  const performedList = parseList(performedInput);
  const targetList = parseList(targetInput);

  const toggleAction = (key: string) => {
    setSelectedActions((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return s;
    });
  };

  const clearFilters = () => {
    setSelectedActions(new Set());
    setPerformedInput("");
    setTargetInput("");
    setDateStart(null);
    setDateEnd(null);
    setQuery("");
    setShowFilters(false);
  };

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceMs = 250;

  // Effect to call server-side search with debounce
  useMemo(() => {
    let mounted = true;
    let handle: any;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const body = {
          q: query || undefined,
          actions: Array.from(selectedActions),
          performed: performedList,
          target: targetList,
          dateStart: dateStart || undefined,
          dateEnd: dateEnd || undefined,
          page,
          limit,
        };

        const res = await fetch("/api/admin-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!mounted) return;
        const json = await res.json();
        if (json && json.success) {
          setItems(json.items || []);
          setTotal(json.total || 0);
        } else {
          setItems([]);
          setTotal(0);
        }
      } catch (err) {
        console.error("Failed to load admin logs:", err);
        setItems([]);
        setTotal(0);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    clearTimeout(handle);
    handle = setTimeout(fetchResults, debounceMs);

    return () => {
      mounted = false;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    query,
    selectedActions,
    performedInput,
    targetInput,
    dateStart,
    dateEnd,
    page,
    limit,
  ]);

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Action Log</CardTitle>
          <CardDescription>No recorded admin actions yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Admin Action Log</CardTitle>
            <CardDescription>
              Immutable history of manual admin actions.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">Show:</div>
            <select
              className="border rounded-md px-2 py-1 text-sm"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-1/3">
            <Input
              placeholder="Search logs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search admin logs"
              className="text-sm"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full sm:w-auto"
          >
            <ChevronDown
              className={`h-4 w-4 mr-2 transition-transform ${
                showFilters ? "rotate-180" : ""
              }`}
            />
            {showFilters ? "Hide" : "Show"} Filters
          </Button>
        </div>

        {showFilters && (
          <div className="space-y-3 md:space-y-0 md:grid md:gap-2 md:grid-cols-2 lg:grid-cols-4">
            {/* Actions filter */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                <div className="text-xs sm:text-sm font-medium">Actions</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(actionLabels).map(([key, label]) => {
                  const active = selectedActions.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleAction(key)}
                      className={`rounded-md px-2 py-1 text-xs border ${
                        active
                          ? "bg-primary text-primary-foreground border-transparent"
                          : "bg-transparent"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Performed by filter */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                <div className="text-xs sm:text-sm font-medium">
                  Performed by
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <input
                  list="performed-users"
                  className="border rounded-md px-2 py-1 w-full text-sm"
                  placeholder="comma-separated usernames"
                  value={performedInput}
                  onChange={(e) => setPerformedInput(e.target.value)}
                  aria-label="Performed by filter"
                />
                <datalist id="performed-users">
                  {users.map((u) => (
                    <option key={u.id} value={u.username} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Target filter */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                <div className="text-xs sm:text-sm font-medium">Target</div>
              </div>
              <div className="flex flex-col gap-1">
                <input
                  list="target-users"
                  className="border rounded-md px-2 py-1 w-full text-sm"
                  placeholder="comma-separated usernames"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  aria-label="Target filter"
                />
                <datalist id="target-users">
                  {users.map((u) => (
                    <option key={u.id} value={u.username} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Date range filter */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                <div className="text-xs sm:text-sm font-medium">Date range</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-1">
                <input
                  type="date"
                  className="border rounded-md px-2 py-1 w-full sm:w-1/2 text-sm"
                  value={dateStart ?? ""}
                  onChange={(e) => setDateStart(e.target.value || null)}
                  aria-label="Start date"
                />
                <input
                  type="date"
                  className="border rounded-md px-2 py-1 w-full sm:w-1/2 text-sm"
                  value={dateEnd ?? ""}
                  onChange={(e) => setDateEnd(e.target.value || null)}
                  aria-label="End date"
                />
              </div>
            </div>

            <div className="col-span-full flex justify-end">
              <Button variant="outline" onClick={clearFilters} size="sm">
                Clear filters
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="overflow-x-auto">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No results
          </div>
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2">When</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Performed By</th>
                  <th className="py-2">Target</th>
                  <th className="py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((entry: any) => {
                  const act = entry.action as AdminActionType;
                  const badgeVariant = badgeVariants[act] ?? "default";
                  const label = actionLabels[act] ?? String(entry.action ?? "");
                  const { displayLines, rawData } = formatMetadataForDisplay(
                    entry.metadata,
                    act,
                    stocks
                  );
                  const isExpanded = expandedRows.has(entry.id);
                  const hasDetails =
                    displayLines.length > 0 || Object.keys(rawData).length > 0;

                  const toggleExpanded = () => {
                    const newSet = new Set(expandedRows);
                    if (newSet.has(entry.id)) {
                      newSet.delete(entry.id);
                    } else {
                      newSet.add(entry.id);
                    }
                    setExpandedRows(newSet);
                  };

                  return (
                    <tr key={entry.id} className="border-t border-border">
                      <td className="py-2 align-top text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 align-top">
                        <Badge variant={badgeVariant}>{label}</Badge>
                      </td>
                      <td className="py-2 align-top">
                        {resolveUser(entry.performedBy || entry.performedBy)}
                      </td>
                      <td className="py-2 align-top">
                        {resolveUser(entry.targetUserId || entry.targetUserId)}
                      </td>
                      <td className="py-2 align-top">
                        <div className="space-y-2">
                          {displayLines.length > 0 ? (
                            <>
                              <div className="space-y-1">
                                {displayLines.map((line, idx) => (
                                  <div key={idx} className="text-sm">
                                    <span className="font-semibold text-foreground">
                                      {line.label}:
                                    </span>
                                    <span className="ml-1 text-muted-foreground">
                                      {line.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {Object.keys(rawData).length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={toggleExpanded}
                                  className="h-6 px-2 text-xs"
                                >
                                  {isExpanded ? "Hide" : "View"} Full JSON
                                </Button>
                              )}
                              {isExpanded &&
                                Object.keys(rawData).length > 0 && (
                                  <pre className="whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-xs overflow-x-auto">
                                    {JSON.stringify(rawData, null, 2)}
                                  </pre>
                                )}
                            </>
                          ) : (
                            <div className="text-muted-foreground text-sm">
                              —
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} -{" "}
                {Math.min(page * limit, total)} of {total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Prev
                </Button>
                <div className="text-sm">Page {page}</div>
                <Button
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
