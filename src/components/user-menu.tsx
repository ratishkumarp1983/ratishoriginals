"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button, buttonVariants } from "@/components/ui/button";

export function UserMenu({
  email,
  name,
  isAdmin,
}: {
  email: string;
  name?: string | null;
  isAdmin: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {isAdmin && (
        <Link
          href="/admin"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Admin
        </Link>
      )}
      <Link
        href="/library"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Library
      </Link>
      <span className="hidden text-sm text-neutral-500 sm:inline" title={email}>
        {name || email}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sign out
      </Button>
    </div>
  );
}
