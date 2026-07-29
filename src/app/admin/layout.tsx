import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/metadata", label: "Metadata fields" },
  { href: "/admin/coupons", label: "Coupons" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-6 py-8">
      <aside className="hidden w-48 shrink-0 md:block">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Admin
        </p>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
