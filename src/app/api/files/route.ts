import { NextResponse } from "next/server";
import { storage } from "@/lib/adapters/storage";
import { verifyToken } from "@/lib/adapters/storage/local";
import { env } from "@/lib/env";

/**
 * Local storage driver's signed-URL endpoint. The LocalStorageAdapter issues
 * URLs pointing here with an HMAC token over (key, expiry). We verify the token
 * and stream the bytes.
 *
 * The token is a short-lived bearer credential (default 30 s) that is only ever
 * generated server-side AFTER the caller's entitlement has been checked
 * (purchase / membership / admin). This route does not re-derive entitlement;
 * it enforces the token. Under STORAGE_DRIVER=r2 this route is unused (R2 issues
 * its own presigned GETs).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig");

  if (!key || !sig || !Number.isFinite(exp)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!verifyToken(key, exp, sig)) {
    return NextResponse.json({ error: "Link expired or invalid" }, { status: 403 });
  }

  try {
    const bytes = await storage().get(key);
    const isPdf = key.endsWith(".pdf");
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": isPdf ? "application/pdf" : "application/octet-stream",
        "Content-Length": String(bytes.length),
        // Private: the URL is per-user and short-lived.
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

// Never let this route be statically cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Reference env so misconfiguration surfaces here too (APP_URL is used to mint
// the URLs that reach this route).
void env.APP_URL;
