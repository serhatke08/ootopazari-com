"use client";

import Image from "next/image";
import type { FeatureBoostListingOption } from "@/lib/feature-boost-listing";
import { PaymentLegalNotice } from "@/components/PaymentLegalNotice";
import {
  FEATURE_BOOST_PACKS,
  computeFeatureBoostEndAfterPurchase,
  formatFeatureBoostEndDisplay,
  formatTryPrice,
  parseListingDate,
} from "@/lib/listing-feature-boost";

type Pack = (typeof FEATURE_BOOST_PACKS)[number];

type Props = {
  selectedListings: FeatureBoostListingOption[];
  selectedPack: Pack | null;
  totalPrice: number;
  submitting: boolean;
  error: string | null;
  onCheckout: () => void;
  sticky?: boolean;
};

export function FeatureBoostOrderSummary({
  selectedListings,
  selectedPack,
  totalPrice,
  submitting,
  error,
  onCheckout,
  sticky = false,
}: Props) {
  const ready = selectedListings.length > 0 && selectedPack != null;

  return (
    <aside
      className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 ${
        sticky ? "lg:sticky lg:top-6" : ""
      }`}
    >
      <h2 className="text-base font-black text-zinc-950 sm:text-lg">Özet</h2>

      {!ready ? (
        <p className="mt-3 text-sm text-zinc-500">
          İlan ve paket seçtiğinizde ödeme burada görünür.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-baseline justify-between gap-3 border-b border-zinc-100 pb-4">
            <div>
              <p className="text-sm font-bold text-zinc-900">{selectedPack.label}</p>
              <p className="text-xs text-zinc-500">
                {selectedListings.length} ilan
                {selectedListings.length > 1
                  ? ` · ${formatTryPrice(selectedPack.fallbackPriceTry)} × ${selectedListings.length}`
                  : null}
              </p>
            </div>
            <p className="text-2xl font-black tabular-nums text-zinc-950 sm:text-3xl">
              {formatTryPrice(totalPrice)}
            </p>
          </div>

          <ul className="mt-3 max-h-52 space-y-2 overflow-y-auto">
            {selectedListings.map((listing) => {
              const projectedEnd = formatFeatureBoostEndDisplay(
                computeFeatureBoostEndAfterPurchase(
                  {
                    featured_until: listing.featuredUntil,
                    feature_boost_campaign_start_at: listing.campaignStartAt,
                    featured_started_at: listing.campaignStartAt,
                    feature_boost_pack_days: listing.packDays,
                  },
                  selectedPack.days
                )
              );
              return (
                <li
                  key={listing.id}
                  className="flex items-center gap-2.5 rounded-lg bg-zinc-50 p-2"
                >
                  <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-200">
                    {listing.coverImageUrl ? (
                      <Image
                        src={listing.coverImageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-zinc-900">
                      #{listing.listingNumber}
                    </p>
                    {projectedEnd ? (
                      <p className="truncate text-[10px] text-zinc-600">
                        Bitiş: {projectedEnd.dateLine}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {error ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={submitting}
            onClick={onCheckout}
            className="mt-4 w-full rounded-xl bg-[#ffc400] px-4 py-3.5 text-sm font-black text-black shadow-sm transition hover:bg-[#ffd24d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Yönlendiriliyor…" : "Güvenli ödemeye geç"}
          </button>
      <p className="mt-2 text-center text-[10px] text-zinc-400">
        PayTR güvenli ödeme
      </p>
      <PaymentLegalNotice className="mt-3" />
        </>
      )}
    </aside>
  );
}
