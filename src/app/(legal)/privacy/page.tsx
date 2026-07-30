import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Privacy policy" };

// NOTE: Working draft matched to the platform. Replace every [PLACEHOLDER] and
// have it reviewed by a qualified professional before launch.
export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy policy" updated="[PLACEHOLDER: date]">
      <p>
        This policy explains what personal data Ratish Originals collects and how
        we use it. The data controller is [PLACEHOLDER: legal entity name],
        [PLACEHOLDER: business address]. Contact: [PLACEHOLDER: contact email].
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> your email, optional name, and a securely
          hashed password (we never store your password in plain text).
        </li>
        <li>
          <strong>Purchases and memberships:</strong> what you bought or
          subscribed to, amounts, and status. Payments are processed by our
          payment provider; we do not receive or store your full card details.
        </li>
        <li>
          <strong>Reading activity:</strong> your library, reading progress,
          bookmarks, and wishlist.
        </li>
        <li>
          <strong>Reviews:</strong> ratings and review text you choose to submit.
        </li>
        <li>
          <strong>Newsletter:</strong> your email, if you subscribe.
        </li>
        <li>
          <strong>Technical:</strong> limited request data such as an IP-derived
          identifier used for security and rate limiting, and basic device or
          browser information.
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>to provide your account, purchases, memberships, and reading access;</li>
        <li>to process payments and prevent fraud and abuse;</li>
        <li>to operate security controls such as login throttling;</li>
        <li>to send service messages and, if you opt in, the newsletter;</li>
        <li>to understand product usage and improve the Service;</li>
        <li>to meet legal and accounting obligations.</li>
      </ul>

      <h2>3. Service providers</h2>
      <p>We share data only with providers who process it on our behalf, including:</p>
      <ul>
        <li>payment processing (Razorpay);</li>
        <li>hosting and database infrastructure;</li>
        <li>email delivery;</li>
        <li>optional product analytics (PostHog) and error monitoring (Sentry), when enabled.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>4. Cookies</h2>
      <p>
        We use strictly necessary cookies for sign-in sessions and security
        (including CSRF protection). If analytics are enabled, they may set
        additional cookies; these are non-essential.
      </p>

      <h2>5. Retention</h2>
      <p>
        We keep account, purchase, and membership records while your account is
        active and as needed for legal, tax, and accounting purposes. You can ask
        us to delete your account, subject to records we must retain by law.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct,
        delete, or export your data, and to object to or restrict certain
        processing. To exercise these, contact [PLACEHOLDER: contact email].
      </p>

      <h2>7. Security</h2>
      <p>
        We protect access with server-side authorisation, hashed passwords,
        signed and short-lived file access, and other safeguards. No system is
        perfectly secure, but we work to protect your data.
      </p>

      <h2>8. Children</h2>
      <p>The Service is not directed to children under 18, and we do not knowingly collect their data.</p>

      <h2>9. International transfers</h2>
      <p>
        Your data may be processed in countries other than yours. Where required,
        we use appropriate safeguards for such transfers.
      </p>

      <h2>10. Changes and contact</h2>
      <p>
        We may update this policy and will post changes here with a new date.
        Questions or requests: [PLACEHOLDER: contact email].
      </p>
    </LegalShell>
  );
}
