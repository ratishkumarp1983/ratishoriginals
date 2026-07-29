"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Placeholder purchase control. The full Razorpay checkout flow is wired up in
 * Step 5; for now this routes anonymous users to sign in and tells others that
 * checkout is arriving next, so the page is complete without faking a payment.
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
      router.push(`/login?callbackUrl=/book/${slug}`);
      return;
    }
    toast.info("Checkout goes live in the next update.");
  }

  return (
    <Button size="lg" onClick={onClick} className="w-full sm:w-auto">
      {label}
    </Button>
  );
}
