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
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-3">
      {FEATURE_BOOST_PACKS.map((pack: Pack) => {
        const selected = selectedPackId === pack.productId;
        const isPopular = pack.productId === POPULAR_PACK_ID;

        return (
          <button
            key={pack.productId}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(pack.productId)}
            className={`relative min-w-[9.5rem] shrink-0 snap-start rounded-2xl border p-4 text-left transition sm:min-w-0 ${
              disabled
                ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-50"
                : selected
                  ? "border-[#ffc400] bg-amber-50 shadow-md ring-2 ring-[#ffc400]/35"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
            }`}
          >
            {isPopular ? (
              <span className="absolute -top-2.5 right-3 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Popüler
              </span>
            ) : null}
            <p className="text-lg font-black text-zinc-950">{pack.label}</p>
            <p className="mt-0.5 text-xs leading-snug text-zinc-600">
              {pack.subtitle}
            </p>
            <p className="mt-4 text-2xl font-black tabular-nums tracking-tight text-zinc-950">
              {formatTryPrice(pack.fallbackPriceTry)}
            </p>
            {listingCount > 1 ? (
              <p className="mt-1 text-xs text-zinc-500">ilan başına</p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
