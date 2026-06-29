"use client";

import { FEATURE_BOOST_PACKS, formatTryPrice } from "@/lib/listing-feature-boost";

type Pack = (typeof FEATURE_BOOST_PACKS)[number];

type Props = {
  selectedPackId: string | null;
  listingCount: number;
  disabled: boolean;
  onSelect: (productId: string) => void;
};

const POPULAR_PACK_ID = "feature_boost_7d_24h";

export function FeatureBoostPackPicker({
  selectedPackId,
  listingCount,
  disabled,
  onSelect,
}: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {FEATURE_BOOST_PACKS.map((pack: Pack) => {
        const selected = selectedPackId === pack.productId;
        const isPopular = pack.productId === POPULAR_PACK_ID;

        return (
          <button
            key={pack.productId}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(pack.productId)}
            className={`relative flex flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition sm:rounded-2xl sm:px-3 sm:py-4 ${
              disabled
                ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-45"
                : selected
                  ? "border-[#ffc400] bg-amber-50 shadow-md ring-2 ring-[#ffc400]/35"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
            }`}
          >
            {isPopular ? (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900 px-2 py-px text-[9px] font-bold uppercase tracking-wide text-white sm:text-[10px]">
                Popüler
              </span>
            ) : null}
            <span className="text-base font-black text-zinc-950 sm:text-lg">
              {pack.label}
            </span>
            <span className="mt-1.5 text-sm font-black tabular-nums text-zinc-950 sm:text-xl">
              {formatTryPrice(pack.fallbackPriceTry)}
            </span>
            {listingCount > 1 ? (
              <span className="mt-0.5 text-[10px] text-zinc-500">/ ilan</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
