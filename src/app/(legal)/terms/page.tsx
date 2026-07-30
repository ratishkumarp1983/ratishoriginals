import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Terms of service" };

// NOTE: This is a working draft written to match the platform. Replace every
// [PLACEHOLDER] and have it reviewed by a qualified professional before launch.
export default function TermsPage() {
  return (
    <LegalShell title="Terms of service" updated="[PLACEHOLDER: date]">
      <p>
        These terms govern your use of Ratish Originals (the &quot;Service&quot;),
        operated by [PLACEHOLDER: legal entity name] (&quot;we&quot;,
        &quot;us&quot;). By creating an account or using the Service you agree to
        these terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. Eligibility and accounts</h2>
      <p>
        You must be at least 18 years old, or the age of majority where you live,
        to buy or subscribe. You are responsible for the accuracy of your account
        details and for keeping your password secure. You are responsible for
        activity under your account.
      </p>

      <h2>2. What you are buying</h2>
      <p>
        Titles are digital works you read online through the Service. A purchase
        grants you a personal, non-exclusive, non-transferable licence to read
        that title online for as long as we offer the Service (&quot;lifetime
        access&quot;). A membership grants online reading access to the included
        titles for as long as the membership is active. You are not buying the
        underlying file, and no ownership of the work transfers to you.
      </p>

      <h2>3. Permitted use and restrictions</h2>
      <p>You may read purchased or membership titles for your own personal use. You may not:</p>
      <ul>
        <li>download, copy, record, scrape, or redistribute the works or any part of them;</li>
        <li>circumvent, disable, or interfere with security, watermarking, or access controls;</li>
        <li>share your account or access credentials, or resell access;</li>
        <li>use automated means to access the Service except as expressly permitted.</li>
      </ul>

      <h2>4. Payments, coupons, and taxes</h2>
      <p>
        Prices are shown at checkout in the stated currency and are charged
        through our payment processor. We do not receive or store your full card
        details. Coupons are subject to their own conditions and may be limited,
        expire, or be withdrawn. Taxes may apply depending on your location.
      </p>

      <h2>5. Memberships and renewals</h2>
      <p>
        A membership runs for the period shown at purchase. Access ends when the
        membership expires unless renewed. Details of renewal and any recurring
        billing are shown at checkout. See our{" "}
        <a href="/refund-policy">Refund policy</a>.
      </p>

      <h2>6. Reviews and user content</h2>
      <p>
        If you submit a rating or review, you confirm it is your own honest
        opinion and does not infringe anyone&apos;s rights or contain unlawful
        content. You grant us a non-exclusive, royalty-free licence to display,
        store, and moderate that content on the Service. We may hide, edit for
        moderation, or remove content that breaches these terms.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        All works, branding, and Service content are owned by us or our licensors
        and are protected by law. Nothing in these terms transfers those rights to
        you beyond the limited reading licence above.
      </p>

      <h2>8. Availability and changes</h2>
      <p>
        We may change, suspend, or discontinue any part of the Service, including
        individual titles, and we may update these terms. Material changes will be
        posted here with a new &quot;last updated&quot; date.
      </p>

      <h2>9. Disclaimers and liability</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind
        to the fullest extent permitted by law. To the maximum extent permitted by
        law, our total liability arising from the Service is limited to the amount
        you paid us in the twelve months before the claim. Nothing limits
        liability that cannot be limited by law.
      </p>

      <h2>10. Termination</h2>
      <p>
        We may suspend or terminate access if you breach these terms. You may stop
        using the Service at any time.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are governed by the laws of [PLACEHOLDER: jurisdiction], and
        disputes are subject to the courts of [PLACEHOLDER: jurisdiction].
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these terms: [PLACEHOLDER: contact email].
      </p>
    </LegalShell>
  );
}
