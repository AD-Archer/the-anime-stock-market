"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";

export function KillSwitchPanel() {
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const currentUser = useStore((s) => s.currentUser);

  const triggerKill = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/_internal/kill-switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kill-secret": secret,
          "x-kill-confirm": "true",
          "x-admin-id": currentUser?.id || "",
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setResult({ status: res.status, body: data });
    } catch (err) {
      setResult({ status: 0, body: { error: String(err) } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-2 text-lg font-semibold">Danger Zone</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          The Kill Switch will permanently clear data from the configured
          database. This is irreversible.
        </p>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => setOpen(true)}>
            Open Kill Switch
          </Button>
        </div>
        {result && (
          <pre className="mt-4 rounded bg-muted p-3 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kill Switch — Confirm</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This operation will clear documents from the main collections. You
              must type the KILL_SWITCH_SECRET value below and check the
              confirmation box to proceed.
            </p>

            <div>
              <label className="text-xs mb-1 block">KILL_SWITCH_SECRET</label>
              <Input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
              />
              <span className="text-sm">I understand this is irreversible</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={triggerKill}
              disabled={!confirmChecked || !secret || loading}
            >
              {loading ? "Running..." : "Execute Kill Switch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
