import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const incoming = new URL(req.url);
  incoming.pathname = "/auth/signin";
  incoming.searchParams.set("oauth", "failed");
  return NextResponse.redirect(incoming);
}
