import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { getOwnedPurchase } from "@/lib/purchases";
import { env } from "@/lib/env";
import { CheckoutClient } from "@/components/store/checkout-client";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser(`/checkout/${slug}`);

  const doc = await prisma.document.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      currency: true,
      status: true,
      coverImage: true,
    },
  });
  if (!doc || doc.status !== "PUBLISHED") notFound();

  if (await getOwnedPurchase(user.id, doc.id)) redirect(`/read/${doc.slug}`);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Checkout</h1>
      <CheckoutClient
        documentId={doc.id}
        slug={doc.slug}
        title={doc.title}
        priceMajor={doc.price.toString()}
        currency={doc.currency}
        hasCover={!!doc.coverImage}
        driver={env.PAYMENTS_DRIVER}
        appName={env.APP_NAME}
      />
    </main>
  );
}
