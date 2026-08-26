function BoostLightningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

type Props = {
  className?: string;
};

/** Ana sayfa kartı — pulse aktifken şimşek rozeti. */
export function ListingBoostChrome({ className = "" }: Props) {
  return (
    <div
      className={`pointer-events-none absolute left-1 top-1 z-[8] flex max-w-[calc(100%-0.5rem)] items-center gap-0.5 truncate rounded-full bg-[#ffc400] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-black shadow-sm sm:left-2 sm:top-2 sm:gap-1 sm:px-2 sm:text-[10px] ${className}`}
    >
      <BoostLightningIcon className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" />
      <span className="truncate">Öne çıkan</span>
    </div>
  );
}

export function ListingBoostBadgeCompact() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-[#ffc400] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
      <BoostLightningIcon className="h-2.5 w-2.5" />
      Öne çıkan
    </span>
  );
}
