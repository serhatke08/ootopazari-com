/**
 * Okunmamış mesaj sayısı rozeti (0 ise render etmez).
 */
export function MessageUnreadBadge({
  count,
  className = "",
  ariaLabel = "okunmamış mesaj",
}: {
  count: number;
  /** Konumlandırma için (örn. absolute -right-1 -top-0.5) */
  className?: string;
  ariaLabel?: string;
}) {
  if (count < 1) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className={`inline-flex min-h-[1.125rem] min-w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ${className}`}
      aria-label={`${ariaLabel}: ${label}`}
    >
      {label}
    </span>
  );
}
