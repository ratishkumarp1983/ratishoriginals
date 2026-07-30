/**
 * Emits a JSON-LD structured-data block (SRS §13 SEO). type="application/ld+json"
 * is data, not executable script, so it is exempt from the script-src CSP and
 * needs no nonce. We escape "<" so a value can never break out of the tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
