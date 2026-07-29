"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

/** Navy-header account controls for signed-in readers. */
export function UserMenu({
  email,
  name,
  isAdmin,
}: {
  email: string;
  name?: string | null;
  isAdmin: boolean;
}) {
  const link =
    "text-sm text-brand-cream/90 transition-colors hover:text-white";
  return (
    <div className="flex items-center gap-4">
      {isAdmin && (
        <Link href="/admin" className={link}>
          Admin
        </Link>
      )}
      <Link href="/library" className={link}>
        Library
      </Link>
      <span
        className="hidden text-sm text-brand-cream/70 sm:inline"
        title={email}
      >
        {name || email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-brand-cream/90 transition-colors hover:bg-white/10"
      >
        Sign out
      </button>
    </div>
  );
}
