/** Uygulama kartı — sağ üst, 8px bordo etiket. */
export function ListingAcilBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute right-[5px] top-[5px] z-[8] flex items-center rounded-md bg-[#8b0000] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white shadow-[0_1px_4px_rgba(0,0,0,0.22)] ${className}`}
      aria-label="Acil ilan"
    >
      Acil
    </div>
  );
}
