"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { AppealStatus } from "@/lib/types";

const statusMap: Record<
  AppealStatus,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export function AppealManagement() {
  const { appeals, users, reviewAppeal, reopenAppeal } = useStore();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const sortedAppeals = useMemo(
    () =>
      [...appeals].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      ),
    [appeals]
  );

  const handleReview = async (appealId: string, status: AppealStatus) => {
    setSubmitting(appealId + status);
    try {
      await reviewAppeal(appealId, status, notes[appealId]);
      setNotes((prev) => ({ ...prev, [appealId]: "" }));
      toast({
        title: "Appeal updated",
        description: `Marked as ${status}.`,
      });
    } catch (error) {
      console.error("Failed to review appeal", error);
      toast({
        title: "Failed to update appeal",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  };

  if (sortedAppeals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appeals</CardTitle>
          <CardDescription>No appeals have been submitted yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedAppeals.map((appeal) => {
        const user = users.find((u) => u.id === appeal.userId);
        const statusMeta = statusMap[appeal.status];
        return (
          <Card key={appeal.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {user?.username || "Unknown User"}
                  </CardTitle>
                  <CardDescription>
                    Submitted {appeal.createdAt.toLocaleString()}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                  {appeal.status !== "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void reopenAppeal(appeal.id)}
                    >
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-left">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {appeal.message}
              </p>
              {appeal.resolutionNotes && (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <p className="font-medium">Resolution Notes</p>
                  <p>{appeal.resolutionNotes}</p>
                </div>
              )}
              {appeal.status !== "pending" && appeal.resolvedAt && (
                <p className="text-xs text-muted-foreground">
                  Resolved {appeal.resolvedAt.toLocaleString()} by{" "}
                  {appeal.resolvedBy || "admin"}
                </p>
              )}
              {appeal.status === "pending" && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Internal notes for this decision"
                    value={notes[appeal.id] ?? ""}
                    onChange={(event) =>
                      setNotes((prev) => ({
                        ...prev,
                        [appeal.id]: event.target.value,
                      }))
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={submitting !== null}
                      onClick={() => handleReview(appeal.id, "rejected")}
                    >
                      Reject
                    </Button>
                    <Button
                      disabled={submitting !== null}
                      onClick={() => handleReview(appeal.id, "approved")}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
