import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Refund policy" };

// NOTE: Working draft matched to the platform. Confirm the refund window and
// replace every [PLACEHOLDER]; have it reviewed by a qualified professional
// before launch. Also confirm it meets your payment provider's requirements.
export default function RefundPolicyPage() {
  return (
    <LegalShell title="Refund policy" updated="[PLACEHOLDER: date]">
      <p>
        This policy explains refunds for purchases and memberships on Ratish
        Originals. Because titles are digital works delivered as immediate online
        access, refunds are limited as set out below.
      </p>

      <h2>1. Digital nature of purchases</h2>
      <p>
        When you buy a title you receive instant online reading access. When you
        subscribe, membership access begins immediately. Because delivery is
        immediate, purchases are generally non-refundable except as described
        here or as required by law.
      </p>

      <h2>2. When we offer a refund</h2>
      <ul>
        <li>
          you were charged in error or charged more than once for the same order;
        </li>
        <li>
          a title you paid for is genuinely inaccessible due to a fault on our
          side that we cannot resolve within a reasonable time;
        </li>
        <li>
          where a refund is required by the consumer law that applies to you.
        </li>
      </ul>
      <p>[PLACEHOLDER: state any goodwill window, e.g. &quot;refund requests within N days of purchase are considered case by case&quot;, or &quot;all sales are final except as above&quot;.]</p>

      <h2>3. Memberships</h2>
      <p>
        [PLACEHOLDER: confirm membership refund terms, e.g. whether the current
        period is refundable, and how cancellation affects access.] Cancelling a
        membership stops future renewals; access continues until the current
        period ends unless a refund is issued.
      </p>

      <h2>4. Coupons and discounts</h2>
      <p>
        Any refund is based on the amount actually paid after discounts. Coupons
        and promotional credits are not refundable for cash.
      </p>

      <h2>5. How to request a refund</h2>
      <p>
        Email [PLACEHOLDER: contact email] from the address on your account with
        your order details and the reason. Approved refunds are returned to your
        original payment method; timing depends on your payment provider and bank.
      </p>

      <h2>6. Contact</h2>
      <p>Questions about this policy: [PLACEHOLDER: contact email].</p>
    </LegalShell>
  );
}
