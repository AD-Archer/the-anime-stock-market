import { NextResponse } from "next/server";
import {
  resolveIndexNowBaseUrl,
  sanitizeIndexNowUrls,
  submitIndexNowUrls,
} from "@/lib/indexnow";

export async function POST(req: Request) {
  const baseUrl = resolveIndexNowBaseUrl(req);
  if (!baseUrl) {
    return NextResponse.json(
      { error: "A public site URL is required before publishing IndexNow URLs." },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const rawUrls = Array.isArray((body as any)?.urlList)
    ? (body as any).urlList
    : Array.isArray((body as any)?.urls)
    ? (body as any).urls
    : typeof (body as any)?.url === "string"
    ? [(body as any).url]
    : [];

  const urlList = sanitizeIndexNowUrls(rawUrls, baseUrl);
  if (urlList.length === 0) {
    return NextResponse.json(
      { error: "No valid same-host URLs were provided." },
      { status: 400 }
    );
  }

  try {
    const result = await submitIndexNowUrls(urlList, { baseUrl });
    return NextResponse.json(result);
  } catch (error) {
    console.warn("Failed to publish IndexNow URLs:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to publish IndexNow URLs.",
      },
      { status: 502 }
    );
  }
}
