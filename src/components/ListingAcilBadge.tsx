/** Ana sayfa Acil satırı — görselin sağ üstünde bordo etiket. */
export function ListingAcilBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute right-1 top-1 z-[8] flex items-center rounded-md border border-[#8b0000]/40 bg-[#8b0000] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-white shadow-sm sm:right-2 sm:top-2 sm:px-2 sm:text-[10px] ${className}`}
      aria-label="Acil ilan"
    >
      Acil
    </div>
  );
}
