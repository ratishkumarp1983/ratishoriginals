import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";

/**
 * Two jobs:
 *
 * 1. Coarse UX redirect (NOT the security boundary): bounce obviously
 *    unauthenticated visitors from protected areas to /login. Real
 *    authorization is enforced server-side in each page/route via
 *    requireUser / requireAdmin (SRS §8).
 * 2. Emit a per-request CSP nonce and the Content-Security-Policy header
 *    (production only; dev needs inline/eval for HMR). Next.js reads the nonce
 *    from the request CSP header and stamps it onto its own scripts.
 */
const PROTECTED_PREFIXES = ["/account", "/library", "/admin"];
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];
const isProd = process.env.NODE_ENV === "production";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isProtected && !SESSION_COOKIES.some((c) => req.cookies.has(c))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?callbackUrl=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (!isProd) return NextResponse.next();

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("content-security-policy", csp);
  return res;
}

export const config = {
  // Run on every route so the CSP covers all HTML documents, except Next
  // internals, static assets (anything with a file extension), the pdf.js
  // worker/fonts under /pdfjs, and API routes (JSON needs no CSP).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|pdfjs|.*\\.[\\w]+$).*)"],
};
