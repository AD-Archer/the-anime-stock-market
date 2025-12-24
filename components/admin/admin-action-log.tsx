"use client";

import { useMemo } from "react";
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
  ban: "Ban",
  unban: "Unban",
  deletion_scheduled: "Deletion Scheduled",
  deletion_finalized: "Deletion Finalized",
};

const badgeVariants: Record<AdminActionType, "default" | "secondary" | "outline" | "destructive"> = {
  money_grant: "default",
  money_withdrawal: "outline",
  stock_grant: "default",
  stock_removal: "outline",
  ban: "destructive",
  unban: "secondary",
  deletion_scheduled: "secondary",
  deletion_finalized: "destructive",
};

export function AdminActionLogPanel() {
  const { adminActionLogs, users } = useStore();

  const entries = useMemo(
    () => [...adminActionLogs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [adminActionLogs]
  );

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

  const resolveUser = (userId: string) => users.find((user) => user.id === userId)?.username || "Unknown";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Action Log</CardTitle>
        <CardDescription>Immutable history of manual admin actions.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
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
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-border">
                <td className="py-2 align-top text-muted-foreground">
                  {entry.createdAt.toLocaleString()}
                </td>
                <td className="py-2 align-top">
                  <Badge variant={badgeVariants[entry.action]}>
                    {actionLabels[entry.action]}
                  </Badge>
                </td>
                <td className="py-2 align-top">{resolveUser(entry.performedBy)}</td>
                <td className="py-2 align-top">{resolveUser(entry.targetUserId)}</td>
                <td className="py-2 align-top">
                  {entry.metadata ? (
                    <pre className="whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-xs">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
