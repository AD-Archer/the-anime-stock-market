import { NextRequest, NextResponse } from "next/server";
import { AllProfanity } from "allprofanity";
import { z } from "zod";
import {
  buildProfanityDecision,
  type ModerationSurface,
} from "@/lib/moderation/shared";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  surface: z.enum(["comment", "direct_message"]),
  location: z.string().trim().max(160).optional(),
});

const profanityFilter = new AllProfanity({
  languages: ["english"],
  silent: true,
  strictMode: true,
  detectPartialWords: false,
  enableLeetSpeak: true,
  algorithm: {
    matching: "hybrid",
    useAhoCorasick: true,
    useBloomFilter: true,
    useContextAnalysis: true,
  },
  contextAnalysis: {
    enabled: true,
    contextWindow: 50,
    languages: ["en"],
    scoreThreshold: 0.6,
  },
  performance: {
    enableCaching: true,
    cacheSize: 1000,
  },
});

const resolveOriginAllowed = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
};

export async function POST(request: NextRequest) {
  if (!resolveOriginAllowed(request)) {
    return NextResponse.json(
      {
        allowed: false,
        blockedTerms: [],
        reason: "Cross-site moderation requests are not allowed.",
      },
      { status: 403 }
    );
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        allowed: false,
        blockedTerms: [],
        reason: "Invalid moderation request payload.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }

  try {
    const result = profanityFilter.detect(body.text);
    const decision = buildProfanityDecision({
      hasProfanity: result.hasProfanity,
      blockedTerms: result.detectedWords,
      cleanedText: result.cleanedText,
      surface: body.surface as ModerationSurface,
    });

    return NextResponse.json({
      ...decision,
      enabled: true,
      provider: "allprofanity",
    });
  } catch (error) {
    console.error("Content moderation request failed:", {
      error: error instanceof Error ? error.message : String(error),
      surface: body.surface,
      location: body.location,
    });

    return NextResponse.json(
      {
        allowed: false,
        blockedTerms: [],
        reason:
          "Content moderation is temporarily unavailable. Please try again in a moment.",
        enabled: false,
      },
      { status: 503 }
    );
  }
}
