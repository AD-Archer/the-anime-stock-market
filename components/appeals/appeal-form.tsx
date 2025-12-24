"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export function AppealForm() {
  const { currentUser, appeals, submitAppeal } = useStore();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const pendingAppeal = useMemo(() => {
    if (!currentUser) return null;
    return appeals.find(
      (appeal) => appeal.userId === currentUser.id && appeal.status === "pending"
    );
  }, [appeals, currentUser]);

  const canSubmit =
    Boolean(currentUser) &&
    !pendingAppeal &&
    message.trim().length >= 20 &&
    status !== "submitting";

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return;
    setStatus("submitting");
    try {
      await submitAppeal(message.trim());
      setMessage("");
      setStatus("success");
    } catch (error) {
      console.error("Failed to submit appeal", error);
      setStatus("error");
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Tell the admin team what happened. Appeals typically receive a response
          within a few days.
        </p>
        {pendingAppeal ? (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            You already have a pending appeal submitted on {pendingAppeal.createdAt.toLocaleString()}.
            We&apos;ll reach out via email once it&apos;s been reviewed.
          </div>
        ) : (
          <Textarea
            placeholder="Explain why your account should be reinstated..."
            value={message}
            onChange={(event) => {
              setStatus("idle");
              setMessage(event.target.value);
            }}
            minLength={20}
            className="min-h-[120px]"
          />
        )}
      </div>
      {!pendingAppeal && (
        <div className="flex items-center gap-3">
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {status === "submitting" ? "Submitting Appeal..." : "Submit Appeal"}
          </Button>
          {status === "success" && (
            <p className="text-sm text-green-500">Appeal submitted successfully.</p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">
              Something went wrong. Please try again.
            </p>
          )}
          {message.trim() && message.trim().length < 20 && (
            <p className="text-sm text-muted-foreground">
              Please provide at least 20 characters of detail.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
