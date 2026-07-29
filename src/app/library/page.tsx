import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  await requireUser("/library");

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Your library</h1>
      <p className="mt-3 text-neutral-500">
        Purchased documents, membership content, reading history, and continue
        reading appear here. Built in a later step.
      </p>
    </main>
  );
}
