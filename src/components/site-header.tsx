import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-helpers";
import { UserMenu } from "@/components/user-menu";
import { buttonVariants } from "@/components/ui/button";

/** Server component: reads the session and renders auth-aware navigation. */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-semibold tracking-tight">
          Ratish Originals
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <UserMenu
              email={user.email}
              name={user.name}
              isAdmin={user.role === "ADMIN"}
            />
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Sign in
              </Link>
              <Link href="/register" className={buttonVariants({ size: "sm" })}>
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
