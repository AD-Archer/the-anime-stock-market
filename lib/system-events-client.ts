"use client";

import type { SystemEventRequest } from "./system-events";

export async function sendSystemEvent(event: SystemEventRequest): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch("/api/system-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.warn("Failed to send system event", error);
  }
}
