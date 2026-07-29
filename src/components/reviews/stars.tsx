/** Five-star rating display (SRS FR-12). Rounds to the nearest whole star. */
export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const filled = Math.round(value);
  return (
    <span className={`inline-flex leading-none ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-hidden
          className={i <= filled ? "text-brand-gold" : "text-neutral-300 dark:text-neutral-700"}
        >
          ★
        </span>
      ))}
    </span>
  );
}
