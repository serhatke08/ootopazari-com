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

/** Uygulama kartı — sağ üst, 8.5px altın rozet. */
export function ListingBoostChrome({ className = "" }: Props) {
  return (
    <div
      className={`pointer-events-none absolute right-[5px] top-[5px] z-[8] flex items-center gap-[3px] rounded-[7px] bg-[#FFC400] px-[5px] py-[3px] pr-1.5 shadow-[0_1px_5px_rgba(0,0,0,0.28)] ${className}`}
    >
      <BoostLightningIcon className="h-[13px] w-[13px] shrink-0 text-black/90" />
      <span className="text-[8.5px] font-black leading-[1.05] tracking-[0.15px] text-black/90">
        Öne çıkan
      </span>
    </div>
  );
}

export function ListingBoostBadgeCompact() {
  return (
    <span className="inline-flex items-center gap-[3px] rounded-[7px] bg-[#FFC400] px-[5px] py-[3px] text-[8.5px] font-black leading-[1.05] text-black/90">
      <BoostLightningIcon className="h-[13px] w-[13px]" />
      Öne çıkan
    </span>
  );
}
