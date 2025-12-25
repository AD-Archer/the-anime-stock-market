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

export function DangerZoneExtra() {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
