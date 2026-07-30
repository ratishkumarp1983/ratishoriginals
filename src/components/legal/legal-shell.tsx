/** Shared container + typography for the legal pages. */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-neutral-500">Last updated: {updated}</p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 dark:[&_h2]:text-neutral-100">
        {children}
      </div>
    </main>
  );
}
