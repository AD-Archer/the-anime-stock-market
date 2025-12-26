"use client";

import { useMemo, useState } from "react";
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

export function AdminActionLogPanel() {
  const { adminActionLogs, users } = useStore();
  const [query, setQuery] = useState("");

  // Filters
  const [selectedActions, setSelectedActions] = useState<Set<string>>(
    new Set()
  );
  const [actionsExclude, setActionsExclude] = useState(false);

  const [performedInput, setPerformedInput] = useState("");
  const [performedExclude, setPerformedExclude] = useState(false);

  const [targetInput, setTargetInput] = useState("");
  const [targetExclude, setTargetExclude] = useState(false);

  const [dateStart, setDateStart] = useState<string | null>(null);
  const [dateEnd, setDateEnd] = useState<string | null>(null);
  const [dateExclude, setDateExclude] = useState(false);

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
    setActionsExclude(false);
    setPerformedInput("");
    setPerformedExclude(false);
    setTargetInput("");
    setTargetExclude(false);
    setDateStart(null);
    setDateEnd(null);
    setDateExclude(false);
    setQuery("");
    setPage(1);
  };

  // Server-side results
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
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
          actionsExclude,
          performed: performedList,
          performedExclude,
          target: targetList,
          targetExclude,
          dateStart: dateStart || undefined,
          dateEnd: dateEnd || undefined,
          dateExclude,
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
    actionsExclude,
    performedInput,
    performedExclude,
    targetInput,
    targetExclude,
    dateStart,
    dateEnd,
    dateExclude,
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Admin Action Log</CardTitle>
            <CardDescription>
              Immutable history of manual admin actions.
            </CardDescription>
          </div>
          <div className="w-full sm:w-1/3">
            <Input
              placeholder="Search logs — action, user, details, id..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search admin logs"
            />
          </div>
        </div>

        {/* Filters row */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {/* Actions filter */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Actions</div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={actionsExclude ? "outline" : "default"}
                  onClick={() => setActionsExclude(false)}
                >
                  Include
                </Button>
                <Button
                  size="sm"
                  variant={actionsExclude ? "default" : "outline"}
                  onClick={() => setActionsExclude(true)}
                >
                  Exclude
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(actionLabels).map(([key, label]) => {
                const active = selectedActions.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleAction(key)}
                    className={`rounded-md px-2 py-1 text-sm border ${
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
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Performed by</div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={performedExclude ? "outline" : "default"}
                  onClick={() => setPerformedExclude(false)}
                >
                  Include
                </Button>
                <Button
                  size="sm"
                  variant={performedExclude ? "default" : "outline"}
                  onClick={() => setPerformedExclude(true)}
                >
                  Exclude
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                list="performed-users"
                className="border rounded-md px-2 py-1 w-full"
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
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Target</div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={targetExclude ? "outline" : "default"}
                  onClick={() => setTargetExclude(false)}
                >
                  Include
                </Button>
                <Button
                  size="sm"
                  variant={targetExclude ? "default" : "outline"}
                  onClick={() => setTargetExclude(true)}
                >
                  Exclude
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                list="target-users"
                className="border rounded-md px-2 py-1 w-full"
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
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Date range</div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={dateExclude ? "outline" : "default"}
                  onClick={() => setDateExclude(false)}
                >
                  Include
                </Button>
                <Button
                  size="sm"
                  variant={dateExclude ? "default" : "outline"}
                  onClick={() => setDateExclude(true)}
                >
                  Exclude
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                className="border rounded-md px-2 py-1 w-1/2"
                value={dateStart ?? ""}
                onChange={(e) => setDateStart(e.target.value || null)}
                aria-label="Start date"
              />
              <input
                type="date"
                className="border rounded-md px-2 py-1 w-1/2"
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
                        {entry.metadata ? (
                          <pre className="whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-xs">
                            {typeof entry.metadata === "string"
                              ? entry.metadata
                              : JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
                <select
                  className="border rounded-md px-2 py-1"
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
