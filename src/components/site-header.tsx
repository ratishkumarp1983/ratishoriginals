import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-helpers";
import { UserMenu } from "@/components/user-menu";

const NAV = [
  { href: "/browse", label: "Books" },
  { href: "/membership", label: "Membership" },
];

/** Brand header: navy chrome, serif wordmark, gold primary action. */
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-navy text-brand-cream">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex flex-col leading-none">
            <span className="font-display text-xl font-semibold tracking-wide text-white">
              Ratish Originals
            </span>
            <span className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-brand-gold">
              Stories. Ideas. Impact.
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-brand-cream/85 transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <nav className="flex items-center gap-3">
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
                className="text-sm text-brand-cream/80 transition-colors hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-brand-gold-soft"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
