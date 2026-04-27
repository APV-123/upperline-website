
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  if (hostname.endsWith("vercel.app")) {
    const url = req.nextUrl.clone();
    url.pathname = `/(id)${pathname}`;
    return NextResponse.rewrite(url);
  }
  if (hostname === "id.upperlineco.com") {
    return NextResponse.rewrite(new URL("/(id)", req.url));
  }

  if (hostname === "portal.upperlineco.com") {
    return NextResponse.rewrite(new URL("/(portal)", req.url));
  }

  return NextResponse.next();
}
