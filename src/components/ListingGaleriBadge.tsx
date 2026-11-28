type Props = {
  className?: string;
};

/** Ana sayfa / vitrin kartı — öne çıkan gibi, galeri ilanı. */
export function ListingGaleriBadge({ className = "" }: Props) {
  return (
    <div
      className={`pointer-events-none absolute left-[5px] top-[5px] z-[8] flex items-center rounded-[7px] bg-[#5D17EB] px-[5px] py-[3px] pr-1.5 shadow-[0_1px_5px_rgba(0,0,0,0.28)] ${className}`}
    >
      <span className="text-[8.5px] font-black leading-[1.05] tracking-[0.15px] text-white">
        Galeri
      </span>
    </div>
  );
}
