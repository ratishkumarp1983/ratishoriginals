import Link from "next/link";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/browse", label: "All books" },
      { href: "/membership", label: "Membership" },
    ],
  },
  {
    title: "Reader support",
    links: [
      { href: "/refund-policy", label: "Refund policy" },
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/library", label: "My library" },
      { href: "/account", label: "My account" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-white/10 bg-brand-navy text-brand-cream">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-3">
          <p className="font-display text-lg font-semibold text-white">
            Ratish Originals
          </p>
          <p className="text-sm text-brand-cream/60">
            A home for ideas that challenge, inspire, and create impact.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brand-gold">
              {col.title}
            </p>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-brand-cream/70 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-brand-cream/50 sm:flex-row">
          <span>© {year} Ratish Originals. All rights reserved.</span>
          <span>Secure payments powered by Razorpay</span>
        </div>
      </div>
    </footer>
  );
}

