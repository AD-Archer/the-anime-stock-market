"use client";

import type { ModerationSurface } from "./shared";

export class ContentModerationError extends Error {
  blockedTerms: string[];

  constructor(message: string, blockedTerms: string[] = []) {
    super(message);
    this.name = "ContentModerationError";
    this.blockedTerms = blockedTerms;
  }
}

type AssertTextAllowedInput = {
  text: string;
  surface: ModerationSurface;
  location?: string;
};

export async function assertTextAllowed({
  text,
  surface,
  location,
}: AssertTextAllowedInput): Promise<void> {
  const response = await fetch("/api/moderation/check", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text,
      surface,
      location,
    }),
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.allowed === false) {
    throw new ContentModerationError(
      payload?.reason || "This content could not be sent. Please revise it and try again.",
      Array.isArray(payload?.blockedTerms) ? payload.blockedTerms : []
    );
  }
}
