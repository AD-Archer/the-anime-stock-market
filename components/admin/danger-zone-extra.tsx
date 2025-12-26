"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { formatCurrencyCompact } from "@/lib/utils";
import { trackPlausible } from "@/lib/analytics";

export function DangerZoneExtra() {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);

  const handleDedupe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dedupe-stocks", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      const mergedCount = data?.count ?? 0;
      const errors = data?.errors ?? [];

      if (!res.ok) {
        toast({
          title: "Dedupe Failed",
          description: data?.error || "Server error during dedupe",
          variant: "destructive",
        });
      } else {
        if (errors.length > 0) {
          toast({
            title: "Dedupe Completed with Errors",
            description: `Merged ${mergedCount} groups, but ${errors.length} deletions/updates failed. See console for details.`,
            variant: "destructive",
          });
          console.error("Dedupe errors:", errors);
        } else {
          toast({
            title: "Dedupe Complete",
            description: `Merged ${mergedCount} groups of duplicates`,
          });
        }

        setTimeout(() => window.location.reload(), 800);
      }
    } catch (err) {
      console.error("Dedupe failed", err);
      toast({
        title: "Dedupe Failed",
        description: String((err as Error).message || err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const handleSyncMetadata = async () => {
    setMetadataLoading(true);
    try {
      const res = await fetch("/api/admin/sync-metadata", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({
          title: "Metadata Sync Failed",
          description: data?.error || "Server error while syncing metadata.",
          variant: "destructive",
        });
        return;
      }

      const {
        stockCount,
        userCount,
        totalVolume,
        stockSource,
        userSource,
        transactionSource,
        debug,
      } = data;
      toast({
        title: "Metadata Updated",
        description: `Characters: ${stockCount ?? "?"}, Users: ${
          userCount ?? "?"
        }, Volume: ${formatCurrencyCompact(totalVolume || 0)}${
          stockSource === "client" || userSource === "client"
            ? " (using client-visible data)"
            : ""
        }${
          debug
            ? ` • Admin totals (stocks/users/tx): ${debug.adminStockReportedTotal}/${debug.adminUserReportedTotal}/${debug.adminTxReportedTotal}`
            : ""
        }`,
      });

      trackPlausible("metadata_sync", { stockCount, userCount, totalVolume });
    } catch (err) {
      console.error("Metadata sync failed", err);
      toast({
        title: "Metadata Sync Failed",
        description: String((err as Error).message || err),
        variant: "destructive",
      });
    } finally {
      setMetadataLoading(false);
    }
  };

  const handleBackfillCharacterNumbers = async () => {
    setBackfillLoading(true);
    try {
      const res = await fetch("/api/admin/backfill-character-numbers", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({
          title: "Backfill Failed",
          description: data?.error || "Server error while backfilling.",
          variant: "destructive",
        });
        return;
      }

      const {
        updated,
        keptExisting,
        missingAssigned,
        fixedDuplicates,
        total,
        reportedTotal,
        sequence,
      } = data;
      toast({
        title: "Character Numbers Backfilled",
        description: `Updated ${updated} (missing ${missingAssigned}, duplicates ${fixedDuplicates}), kept ${keptExisting}, total ${total} (reported ${reportedTotal}). Sequence set to ${sequence}.`,
      });

      trackPlausible("character_number_backfill", {
        updated,
        keptExisting,
        missingAssigned,
        fixedDuplicates,
        total,
        reportedTotal,
      });
    } catch (err) {
      console.error("Backfill character numbers failed", err);
      toast({
        title: "Backfill Failed",
        description: String((err as Error).message || err),
        variant: "destructive",
      });
    } finally {
      setBackfillLoading(false);
    }
  };

  return (
    <div className="rounded-md border bg-card p-6">
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        Danger Actions
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">
        The actions below are destructive. Use with caution.
      </p>

      <div className="space-y-3">
        <div>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Merge Duplicate Stocks
          </Button>
        </div>
        <div className="space-y-1">
          <Button
            variant="secondary"
            onClick={handleBackfillCharacterNumbers}
            disabled={backfillLoading}
          >
            {backfillLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Backfilling...
              </>
            ) : (
              "Backfill Character Numbers"
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Assigns sequential numbers to stocks (ordered by created date) and
            updates the sequence used for new imports.
          </p>
        </div>
        <div className="space-y-1">
          <Button
            variant="outline"
            onClick={handleSyncMetadata}
            disabled={metadataLoading}
          >
            {metadataLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing Metadata...
              </>
            ) : (
              "Recalculate Metadata Counters"
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Refreshes character count, user count, and total volume from
            Appwrite.
          </p>
        </div>
      </div>

      {confirmOpen && (
        <Dialog open onOpenChange={() => !loading && setConfirmOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Merge Duplicate Stocks</DialogTitle>
              <DialogDescription>
                This will merge duplicate stocks (grouped by Anilist ID or
                normalized name). This action cannot be undone and may take some
                time. Do you want to continue?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDedupe}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Merging...
                  </>
                ) : (
                  "Merge Duplicates"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
