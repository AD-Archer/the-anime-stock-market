"use client";

import { useState } from "react";
import { AlertCircle, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";

interface ErrorReportButtonProps {
  className?: string;
  position?: "floating" | "inline";
  autoDetectErrors?: boolean;
  error?: Error;
}

export function ErrorReportButton({
  className,
  position = "floating",
  autoDetectErrors = true,
  error,
}: ErrorReportButtonProps) {
  const { currentUser } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    affectedFeature: "",
    additionalContext: "",
  });

  const handleSubmit = async () => {
    if (!formData.affectedFeature.trim()) {
      alert("Please describe what you were doing when the error occurred.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        errorType: error?.name || "Error",
        errorMessage: error?.message || "Unknown error",
        errorStack: error?.stack,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        userId: currentUser?.id,
        affectedFeature: formData.affectedFeature,
        additionalContext: formData.additionalContext,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch("/api/support/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as any;

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit error report");
      }

      setTicketId(result.ticketId);
      setIsSuccess(true);
      setFormData({ affectedFeature: "", additionalContext: "" });

      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
        setTicketId(null);
      }, 3000);
    } catch (err) {
      console.error("Failed to submit error report:", err);
      alert(
        `Failed to submit error report: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (position === "floating") {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-4 right-4 p-3 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all z-40 ${className || ""}`}
          title="Report an error"
          aria-label="Report an error"
        >
          <AlertCircle className="w-6 h-6" />
        </button>

        <ErrorReportDialog
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          isSubmitting={isSubmitting}
          isSuccess={isSuccess}
          ticketId={ticketId}
          formData={formData}
          onFormDataChange={setFormData}
          onSubmit={handleSubmit}
          error={error}
        />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className={`gap-2 ${className || ""}`}
      >
        <AlertCircle className="w-4 h-4" />
        Report an Error
      </Button>

      <ErrorReportDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        isSubmitting={isSubmitting}
        isSuccess={isSuccess}
        ticketId={ticketId}
        formData={formData}
        onFormDataChange={setFormData}
        onSubmit={handleSubmit}
        error={error}
      />
    </>
  );
}

interface ErrorReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  isSuccess: boolean;
  ticketId: string | null;
  formData: {
    affectedFeature: string;
    additionalContext: string;
  };
  onFormDataChange: (data: { affectedFeature: string; additionalContext: string }) => void;
  onSubmit: () => Promise<void>;
  error?: Error;
}

function ErrorReportDialog({
  isOpen,
  onOpenChange,
  isSubmitting,
  isSuccess,
  ticketId,
  formData,
  onFormDataChange,
  onSubmit,
  error,
}: ErrorReportDialogProps) {
  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <h2 className="text-xl font-semibold">Thank you!</h2>
            <p className="text-center text-sm text-muted-foreground">
              Your error report has been submitted. Our team will investigate and work on a fix.
            </p>
            {ticketId && (
              <p className="text-xs text-muted-foreground">
                Ticket ID: <code className="bg-muted px-2 py-1 rounded">{ticketId}</code>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Report an Error
          </DialogTitle>
          <DialogDescription>
            Help us improve by reporting this error. Your feedback helps us identify and fix issues faster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950 p-3 border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {error.message}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="feature" className="text-sm font-medium">
              What were you doing? *
            </label>
            <Input
              id="feature"
              placeholder="e.g., trying to buy anime stocks, viewing my portfolio"
              value={formData.affectedFeature}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  affectedFeature: e.target.value,
                })
              }
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              This helps us understand the context of the error.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="context" className="text-sm font-medium">
              Additional details (optional)
            </label>
            <Textarea
              id="context"
              placeholder="Any additional information that might help us fix this..."
              value={formData.additionalContext}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  additionalContext: e.target.value,
                })
              }
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            We&apos;ll also capture your browser info and the page URL to help with debugging.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void onSubmit()}
            disabled={isSubmitting || !formData.affectedFeature.trim()}
            className="gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
