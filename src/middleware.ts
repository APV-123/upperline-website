import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const hostname = host.split(":")[0];
  const { pathname } = req.nextUrl;

  const rewrite = (path: string) => {
    const url = req.nextUrl.clone();
    url.pathname = path;
    return NextResponse.rewrite(url);
  };

  // Preview URLs → behave like id.upperlineco.com
  if (hostname.endsWith("vercel.app")) {
    if (pathname === "/") return rewrite("/(id)/id-root");
    return rewrite(`/(id)${pathname}`);
  }

  if (hostname === "id.upperlineco.com") {
    if (pathname === "/") return rewrite("/(id)/id-root");
    return rewrite(`/(id)${pathname}`);
  }

  if (hostname === "portal.upperlineco.com") {
    if (pathname === "/") return rewrite("/(portal)/portal-root");
    return rewrite(`/(portal)${pathname}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|assets|api).*)',
  ],
};
