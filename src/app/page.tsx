import Link from "next/link";
import { BookOpen, Infinity as InfinityIcon, ShieldCheck, HeartHandshake, Crown, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getActiveMembership } from "@/lib/membership";
import { formatPrice } from "@/lib/format";
import { DocumentCard } from "@/components/store/document-card";
import { BookCover } from "@/components/store/book-cover";
import { NewsletterForm } from "@/components/store/newsletter-form";

export const dynamic = "force-dynamic";

const TRUST = [
  { icon: BookOpen, title: "Preview before you buy", note: "Read sample chapters" },
  { icon: InfinityIcon, title: "Lifetime access", note: "Yours forever" },
  { icon: ShieldCheck, title: "Secure and private", note: "Your data is safe" },
  { icon: HeartHandshake, title: "Support the author", note: "Every purchase helps" },
];

export default async function Home() {
  const [docs, plan, user] = await Promise.all([
    prisma.document.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 10,
      select: { id: true, slug: true, title: true, price: true, currency: true, coverImage: true },
    }),
    prisma.membership.findFirst({ where: { active: true }, orderBy: { price: "asc" } }),
    getCurrentUser(),
  ]);

  const membership = user ? await getActiveMembership(user.id) : null;
  const flagship = docs[0];

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-navy text-brand-cream">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-[1.1] text-white sm:text-5xl">
              Ideas that inspire.
              <br />
              <span className="text-brand-gold">Stories that stay.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-brand-cream/85">
              Practical original books on leadership, technology, AI, and human
              potential by Ratish Kumar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link href="/library" className="rounded-md bg-brand-gold px-6 py-3 text-sm font-medium text-brand-navy transition-colors hover:bg-brand-gold-soft">
                  Go to your library
                </Link>
              ) : (
                <Link href="/browse" className="rounded-md bg-brand-gold px-6 py-3 text-sm font-medium text-brand-navy transition-colors hover:bg-brand-gold-soft">
                  Explore books
                </Link>
              )}
              <Link href="/membership" className="rounded-md border border-white/25 px-6 py-3 text-sm font-medium text-brand-cream transition-colors hover:bg-white/10">
                Become a member
              </Link>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            {flagship ? (
              <Link href={`/book/${flagship.slug}`} className="w-56 sm:w-64">
                <BookCover
                  documentId={flagship.id}
                  title={flagship.title}
                  className="aspect-[3/4] rounded-lg shadow-2xl ring-1 ring-white/10"
                  titleClass="text-2xl"
                />
                <p className="mt-3 text-center text-sm text-brand-cream/75">
                  Featured: {flagship.title}
                </p>
              </Link>
            ) : (
              <div className="w-56 rounded-lg border border-white/15 p-10 text-center text-sm text-brand-cream/50">
                New titles coming soon
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-brand-cream">
        <div className="mx-auto -mt-8 max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 md:grid-cols-4">
            {TRUST.map((t) => (
              <div key={t.title} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-cream text-brand-gold">
                  <t.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-sm font-medium text-brand-ink">{t.title}</p>
                  <p className="text-[13px] text-brand-ink/70">{t.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest releases */}
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold text-brand-ink">Latest releases</h2>
            <Link href="/browse" className="inline-flex items-center gap-1 text-sm text-brand-ink/60 hover:text-brand-ink">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {docs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-brand-navy/20 p-10 text-center text-brand-ink/50">
              No titles published yet. Check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5">
              {docs.slice(0, 5).map((d) => (
                <DocumentCard
                  key={d.id}
                  doc={{ id: d.id, slug: d.slug, title: d.title, price: d.price, currency: d.currency, hasCover: !!d.coverImage }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Membership CTA */}
      {plan && !membership && (
        <section className="bg-brand-navy-2 text-brand-cream">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-12 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <Crown className="mt-1 h-8 w-8 text-brand-gold" strokeWidth={1.5} />
              <div>
                <h2 className="font-display text-2xl font-semibold text-white">Become a premium reader</h2>
                <p className="mt-1 max-w-xl text-brand-cream/80">
                  Member-only titles, member discounts, and early access to new
                  releases from {formatPrice(plan.price, plan.currency)} per year.
                </p>
              </div>
            </div>
            <Link href="/membership" className="shrink-0 rounded-md bg-brand-gold px-6 py-3 text-sm font-medium text-brand-navy transition-colors hover:bg-brand-gold-soft">
              Join now
            </Link>
          </div>
        </section>
      )}

      {/* About the author */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-16 sm:grid-cols-[200px_1fr]">
          <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl bg-brand-navy font-display text-5xl text-brand-gold">
            RK
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-brand-gold">About the author</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-brand-ink">Ratish Kumar</h2>
            <p className="mt-1 text-sm text-brand-ink/70">Author, entrepreneur, and AI educator</p>
            <p className="mt-4 max-w-xl text-brand-ink/80">
              Ratish writes practical books on leadership, technology, and human
              potential, distilling hard-won lessons into ideas you can act on.
              Every title here is an original, written to challenge, inspire, and
              create impact.
            </p>
            <Link href="/browse" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand-navy hover:underline">
              Read the books <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-brand-cream-2">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-14 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold text-brand-ink">Stay in the loop</h2>
            <p className="mt-1 text-brand-ink/70">
              New releases, member offers, and reading notes. Plus a free chapter
              to start.
            </p>
          </div>
          <NewsletterForm source="home" />
        </div>
      </section>
    </>
  );
}
