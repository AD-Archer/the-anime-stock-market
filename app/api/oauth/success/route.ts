import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const incoming = new URL(req.url);
  const destination = new URL("/market", incoming.origin);
  if (incoming.searchParams.toString()) {
    destination.search = incoming.searchParams.toString();
  }
  return NextResponse.redirect(destination);
}
