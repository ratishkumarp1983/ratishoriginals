"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Purchase entry point. Anonymous users are routed to sign in (and back to the
 * book); authenticated users go to checkout, where the Razorpay/mock flow and
 * coupons live.
 */
export function BuyButton({
  slug,
  isAuthenticated,
  label,
}: {
  slug: string;
  isAuthenticated: boolean;
  label: string;
}) {
  const router = useRouter();

  function onClick() {
    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=/checkout/${slug}`);
      return;
    }
    router.push(`/checkout/${slug}`);
  }

  return (
    <Button size="lg" onClick={onClick} className="w-full sm:w-auto">
      {label}
    </Button>
  );
}
