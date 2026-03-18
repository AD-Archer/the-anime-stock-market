"use client";

import { sendSystemEvent } from "./system-events-client";

export interface ErrorContext {
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  pageUrl: string;
  userAgent: string;
  affectedFeature?: string;
  additionalContext?: string;
}

interface DedupKey {
  type: string;
  message: string;
  url: string;
}

interface ReportedError {
  timestamp: number;
  count: number;
}

const reportedErrors = new Map<string, ReportedError>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000;
const MAX_ERRORS_PER_MINUTE = 5;
const BATCH_DELAY_MS = 1000;

let pendingErrors: ErrorContext[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

function getDedupKey(error: ErrorContext): string {
  return `${error.errorType}|${error.errorMessage}|${error.pageUrl}`;
}

function shouldReportError(error: ErrorContext): boolean {
  const key = getDedupKey(error);
  const now = Date.now();

  const previous = reportedErrors.get(key);

  if (previous && now - previous.timestamp < DEDUP_WINDOW_MS) {
    previous.count++;
    if (previous.count > MAX_ERRORS_PER_MINUTE) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[ErrorReporter] Rate limit exceeded for error: ${key}`,
          previous
        );
      }
      return false;
    }
    return true;
  }

  reportedErrors.set(key, { timestamp: now, count: 1 });
  return true;
}

async function flushPendingErrors(): Promise<void> {
  if (pendingErrors.length === 0) return;

  const errorsToSend = [...pendingErrors];
  pendingErrors = [];

  if (batchTimeout) clearTimeout(batchTimeout);
  batchTimeout = null;

  for (const error of errorsToSend) {
    try {
      await sendSystemEvent({
        type: "error_report",
        metadata: {
          errorType: error.errorType,
          errorMessage: error.errorMessage,
          errorStack: error.errorStack,
          pageUrl: error.pageUrl,
          userAgent: error.userAgent,
          affectedFeature: error.affectedFeature,
          additionalContext: error.additionalContext,
          timestamp: new Date().toISOString(),
        },
      } as any);
    } catch (err) {
      console.error("[ErrorReporter] Failed to send error report:", err);
    }
  }
}

function scheduleBatch(): void {
  if (batchTimeout) return;

  batchTimeout = setTimeout(() => {
    void flushPendingErrors();
  }, BATCH_DELAY_MS);
}

export async function reportError(error: ErrorContext): Promise<void> {
  if (typeof window === "undefined") return;

  if (!shouldReportError(error)) {
    if (process.env.NODE_ENV === "development") {
      console.log("[ErrorReporter] Deduped error report:", error.errorType);
    }
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[ErrorReporter] Reporting error:", {
      type: error.errorType,
      message: error.errorMessage,
      url: error.pageUrl,
      feature: error.affectedFeature,
    });
  }

  pendingErrors.push(error);
  scheduleBatch();
}

export function initializeErrorReporting(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event: ErrorEvent) => {
    void reportError({
      errorType: event.error?.name || "Error",
      errorMessage: event.message,
      errorStack: event.error?.stack,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
    });
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const error = event.reason;
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const errorType = error instanceof Error ? error.name : "UnhandledPromiseRejection";

    void reportError({
      errorType,
      errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
    });
  });

  if (process.env.NODE_ENV === "development") {
    console.log("[ErrorReporter] Initialized global error handlers");
  }
}

export async function captureErrorAndShowForm(
  error: ErrorContext
): Promise<void> {
  await reportError(error);

  const subject = encodeURIComponent(`Error: ${error.errorType}`);
  const body = encodeURIComponent(
    `I encountered an error: ${error.errorMessage}\n\nPage: ${error.pageUrl}`
  );
  window.location.href = `/support?subject=${subject}&body=${body}&tag=error`;
}
