"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { loadRazorpay, type RazorpayHandlerResult } from "@/lib/razorpay-loader";

/**
 * Subscribe to a membership plan. Shares the payment path with checkout: create
 * an order, pay (mock or Razorpay), then rely on server-verified completion.
 */
export function SubscribeButton({
  membershipId,
  planName,
  appName,
  driver,
  isAuthenticated,
  label,
}: {
  membershipId: string;
  planName: string;
  appName: string;
  driver: string;
  isAuthenticated: boolean;
  label: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [busy, setBusy] = useState(false);

  async function subscribe() {
    if (!isAuthenticated) {
      router.push("/login?callbackUrl=/membership");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/membership/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        toast.error((data.error as string) ?? "Subscription failed.");
        setBusy(false);
        return;
      }

      if (data.kind === "activated") return finish();

      const orderId = data.orderId as string;
      if (driver === "razorpay") {
        await loadRazorpay();
        if (!window.Razorpay) {
          toast.error("Could not load the payment widget.");
          setBusy(false);
          return;
        }
        const rzp = new window.Razorpay({
          key: data.keyId as string,
          order_id: orderId,
          amount: data.amountMinor as number,
          currency: data.currency as string,
          name: appName,
          description: `${planName} membership`,
          handler: (r: RazorpayHandlerResult) => verify(r),
          modal: { ondismiss: () => setBusy(false) },
        });
        rzp.open();
      } else {
        const done = await fetch("/api/checkout/mock-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        if (!done.ok) {
          toast.error("Payment could not be completed.");
          setBusy(false);
          return;
        }
        finish();
      }
    } catch {
      toast.error("Something went wrong.");
      setBusy(false);
    }
  }

  async function verify(r: RazorpayHandlerResult) {
    const v = await fetch("/api/checkout/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: r.razorpay_order_id,
        paymentId: r.razorpay_payment_id,
        signature: r.razorpay_signature,
      }),
    });
    if (v.ok) finish();
    else {
      toast.error("Payment verification failed.");
      setBusy(false);
    }
  }

  async function finish() {
    toast.success("Welcome to Premium.");
    await update();
    router.refresh();
    setBusy(false);
  }

  return (
    <Button size="lg" className="w-full" onClick={subscribe} disabled={busy}>
      {busy ? "Processing..." : label}
    </Button>
  );
}
