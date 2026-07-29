import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Coarse UX redirect only. This is NOT the security boundary - it just checks
 * for the presence of a session cookie and bounces obviously-unauthenticated
 * visitors from protected areas to /login. Real authorization (identity, role,
 * entitlement) is enforced server-side in each page/layout/route handler via
 * `requireUser` / `requireAdmin` (SRS §8).
 */
const PROTECTED_PREFIXES = ["/account", "/library", "/admin"];

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((c) => req.cookies.has(c));
  if (hasSession) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?callbackUrl=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/account/:path*", "/library/:path*", "/admin/:path*"],
};
