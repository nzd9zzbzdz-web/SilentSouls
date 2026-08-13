import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "__session";

/**
 * Next 16 proxy (formerly middleware). Keep it light: cookie PRESENCE check
 * only — real verification (verifySessionCookie + org membership) happens in
 * the portal layout with the Admin SDK. M9 adds hostname→orgSlug rewriting.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Discord launches an Activity at the ROOT of its URL mapping, which here is
  // the public shopfront. Every launch carries `frame_id`, and nothing else
  // ever does, so it is a safe tell: serve the embedded screen instead.
  // A rewrite rather than a redirect, because the iframe's query string
  // (guild_id, frame_id) has to survive for the client SDK to read.
  if (pathname === "/" && req.nextUrl.searchParams.has("frame_id")) {
    const url = req.nextUrl.clone();
    url.pathname = "/activity";
    return NextResponse.rewrite(url);
  }

  // /{orgSlug}/portal/** requires a session cookie; bounce to the gateway.
  const portalMatch = pathname.match(/^\/([^/]+)\/portal(?:\/|$)/);
  if (portalMatch && !req.cookies.get(SESSION_COOKIE_NAME)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${portalMatch[1]}/volunteer-resources`;
    url.searchParams.set("signin", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
