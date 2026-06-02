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
    <div className={`pointer-events-none absolute left-2 top-2 z-[8] flex items-center gap-1 rounded-full bg-[#ffc400] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-black shadow-sm ${className}`}>
      <BoostLightningIcon className="h-3 w-3" />
      <span>Öne çıkan</span>
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
