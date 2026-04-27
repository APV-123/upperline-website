import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const { pathname } = req.nextUrl;

  // ✅ Dev / preview: treat vercel.app like id.upperlineco.com
  if (hostname.endsWith("vercel.app")) {
    const url = req.nextUrl.clone();
    url.pathname = `/(id)${pathname}`;
    return NextResponse.rewrite(url);
  }

  // ✅ Identity surface
  if (hostname === "id.upperlineco.com") {
    const url = req.nextUrl.clone();
    url.pathname = `/(id)${pathname}`;
    return NextResponse.rewrite(url);
  }

  // ✅ Portal surface
  if (hostname === "portal.upperlineco.com") {
    const url = req.nextUrl.clone();
    url.pathname = `/(portal)${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
