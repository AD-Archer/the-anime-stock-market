import { NextResponse } from "next/server";
import { supportService } from "@/lib/database";
import { sendSystemEvent } from "@/lib/system-events-client";

interface ErrorReportRequest {
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  pageUrl: string;
  userAgent: string;
  userId?: string;
  affectedFeature?: string;
  additionalContext?: string;
  timestamp: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ErrorReportRequest;

    const { errorType, errorMessage, errorStack, pageUrl, userAgent, userId, affectedFeature, additionalContext, timestamp } = body;

    if (!errorType || !errorMessage || !pageUrl || !userAgent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const urlObj = new URL(pageUrl);
    const pathname = urlObj.pathname || "/";

    const subject = `Error: ${errorType} on ${pathname}`;
    const message = `
Error Type: ${errorType}
Message: ${errorMessage}
Page: ${pageUrl}
Affected Feature: ${affectedFeature || "unknown"}
Time: ${timestamp}

User Agent: ${userAgent}

${additionalContext ? `User Notes: ${additionalContext}` : ""}

${errorStack ? `Stack Trace:\n${errorStack}` : ""}
    `.trim();

    const ticket = await supportService.create({
      userId,
      contactEmail: undefined,
      subject,
      message,
      messages: [],
      status: "open",
      tag: "error",
      referenceId: undefined,
      assignedTo: undefined,
    } as any);

    try {
      await sendSystemEvent({
        type: "error_report",
        userId,
        metadata: {
          id: ticket.id,
          subject,
          errorType,
          errorMessage,
          pageUrl,
          affectedFeature,
          timestamp,
        },
      } as any);
    } catch (err) {
      console.warn("Failed to send error report system event:", err);
    }

    return NextResponse.json(
      {
        success: true,
        ticketId: ticket.id,
        message: "Error report submitted. Thank you!",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create error report:", error);
    return NextResponse.json(
      {
        error: "Failed to submit error report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
