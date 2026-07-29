import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getReadAccess } from "@/lib/entitlements";
import { PdfReader } from "@/components/reader/pdf-reader";

export const metadata: Metadata = { title: "Reading", robots: { index: false } };

export default async function ReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { slug } = await params;
  const { mode: modeParam } = await searchParams;

  const doc = await prisma.document.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      samplePages: true,
      pageCount: true,
    },
  });
  if (!doc) notFound();

  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";
  if (doc.status !== "PUBLISHED" && !isAdmin) notFound();

  const access = await getReadAccess(user, doc.id);
  // Full unless the caller explicitly asked for the sample or lacks access.
  const mode: "sample" | "full" =
    access.canReadFull && modeParam !== "sample" ? "full" : "sample";

  const stamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const watermark =
    mode === "full"
      ? `${user?.email ?? "reader"} · ${stamp}`
      : `${user?.email ?? "guest"} · sample · ${stamp}`;

  const sampleNote = `Sample preview: first ${doc.samplePages} page${
    doc.samplePages === 1 ? "" : "s"
  }`;

  return (
    <PdfReader
      documentId={doc.id}
      mode={mode}
      watermark={watermark}
      title={doc.title}
      buyHref={`/book/${doc.slug}`}
      sampleNote={sampleNote}
    />
  );
}
