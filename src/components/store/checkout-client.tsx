"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice, isFree } from "@/lib/format";
import { loadRazorpay } from "@/lib/razorpay-loader";

interface Props {
  documentId: string;
  slug: string;
  title: string;
  priceMajor: string;
  currency: string;
  hasCover: boolean;
  driver: string;
  appName: string;
}

export function CheckoutClient(props: Props) {
  const router = useRouter();
  const base = Number(props.priceMajor);

  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [paying, setPaying] = useState(false);
  const [discount, setDiscount] = useState<{
    code: string;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);

  const finalAmount = discount ? discount.finalAmount : base;

  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setApplying(true);
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: props.documentId, code }),
    });
    setApplying(false);
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      discountAmount?: number;
      finalAmount?: number;
      code?: string;
    };
    if (!res.ok || !data.ok) {
      setDiscount(null);
      toast.error(data.error ?? "Coupon could not be applied.");
      return;
    }
    setDiscount({
      code: data.code!,
      discountAmount: data.discountAmount!,
      finalAmount: data.finalAmount!,
    });
    toast.success("Coupon applied.");
  }

  function removeCoupon() {
    setDiscount(null);
    setCode("");
  }

  async function pay() {
    setPaying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: props.documentId,
          couponCode: discount?.code ?? code ?? "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        toast.error((data.error as string) ?? "Checkout failed.");
        setPaying(false);
        return;
      }

      if (data.kind === "granted") {
        finish();
        return;
      }

      const orderId = data.orderId as string;
      if (props.driver === "razorpay") {
        await payWithRazorpay(data);
      } else {
        // Mock gateway: simulate a successful capture server-side.
        const done = await fetch("/api/checkout/mock-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        if (!done.ok) {
          toast.error("Payment could not be completed.");
          setPaying(false);
          return;
        }
        finish();
      }
    } catch {
      toast.error("Something went wrong.");
      setPaying(false);
    }
  }

  async function payWithRazorpay(data: Record<string, unknown>) {
    await loadRazorpay();
    if (!window.Razorpay) {
      toast.error("Could not load the payment widget.");
      setPaying(false);
      return;
    }
    const rzp = new window.Razorpay({
      key: data.keyId as string,
      order_id: data.orderId as string,
      amount: data.amountMinor as number,
      currency: data.currency as string,
      name: props.appName,
      description: props.title,
      handler: async (r) => {
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
          setPaying(false);
        }
      },
      modal: { ondismiss: () => setPaying(false) },
    });
    rzp.open();
  }

  function finish() {
    toast.success("You now own this title.");
    router.push(`/read/${props.slug}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="h-24 w-18 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
          {props.hasCover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/documents/${props.documentId}/cover`}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{props.title}</p>
          <p className="mt-1 text-sm text-neutral-500">
            {isFree(base) ? "Free" : formatPrice(base, props.currency)}
          </p>
        </div>
      </div>

      {!isFree(base) && (
        <div className="space-y-3">
          {discount ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/40">
              <span className="text-emerald-700 dark:text-emerald-300">
                Coupon {discount.code}: -{formatPrice(discount.discountAmount, props.currency)}
              </span>
              <button
                type="button"
                onClick={removeCoupon}
                className="text-xs text-neutral-500 underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={applyCoupon} className="space-y-2">
              <Label htmlFor="coupon">Have a coupon?</Label>
              <div className="flex gap-2">
                <Input
                  id="coupon"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter code"
                />
                <Button type="submit" variant="outline" disabled={applying || !code.trim()}>
                  {applying ? "Checking..." : "Apply"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <div className="flex justify-between text-lg">
          <span className="font-medium">Total</span>
          <span className="font-semibold tabular-nums">
            {finalAmount <= 0 ? "Free" : formatPrice(finalAmount, props.currency)}
          </span>
        </div>
        <Button size="lg" className="w-full" onClick={pay} disabled={paying}>
          {paying
            ? "Processing..."
            : finalAmount <= 0
              ? "Get it free"
              : `Pay ${formatPrice(finalAmount, props.currency)}`}
        </Button>
        {props.driver !== "razorpay" && (
          <p className="text-center text-xs text-neutral-400">
            Mock gateway (development): no real payment is taken.
          </p>
        )}
      </div>
    </div>
  );
}
