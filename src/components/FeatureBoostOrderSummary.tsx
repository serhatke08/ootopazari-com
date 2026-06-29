"use client";

import type { FeatureBoostListingOption } from "@/lib/feature-boost-listing";
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
  selectedPack: Pack;
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
  const hasActive = selectedListings.some((l) => l.isBoostActive);

  return (
    <aside
      className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 ${
        sticky ? "lg:sticky lg:top-6" : ""
      }`}
    >
      <h2 className="text-lg font-black text-zinc-950">Sipariş özeti</h2>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Paket
          </p>
          <p className="mt-1 text-base font-bold text-zinc-900">
            {selectedPack.label}
          </p>
          <p className="text-sm text-zinc-600">{selectedPack.subtitle}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            İlanlar ({selectedListings.length})
          </p>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
            {selectedListings.map((listing) => {
              const end = listing.featuredUntil
                ? formatFeatureBoostEndDisplay(
                    parseListingDate(listing.featuredUntil)
                  )
                : null;
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
                  className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5 text-sm"
                >
                  <p className="font-semibold text-zinc-900">
                    #{listing.listingNumber} · {listing.title}
                  </p>
                  {end ? (
                    <div className="mt-1.5 text-xs text-zinc-600">
                      <span className="font-medium text-amber-800">
                        Mevcut bitiş:{" "}
                      </span>
                      <span className="block font-bold text-zinc-800">
                        {end.dateLine}
                      </span>
                      <span className="tabular-nums">saat {end.timeLine}</span>
                      {end.remainingLabel ? (
                        <span className="ml-1 font-semibold text-amber-700">
                          · {end.remainingLabel}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {projectedEnd ? (
                    <div className="mt-2 text-xs text-emerald-800">
                      <span className="font-medium">Ödeme sonrası bitiş: </span>
                      <span className="block font-bold">{projectedEnd.dateLine}</span>
                      <span className="tabular-nums">saat {projectedEnd.timeLine}</span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        {hasActive ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
            Aktif kampanyası olan ilanlara yeni paket{" "}
            <strong>mevcut bitiş tarihinin üzerine eklenir</strong>; kalan süre
            kaybolmaz.
          </p>
        ) : null}

        <div className="flex items-end justify-between border-t border-zinc-100 pt-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Toplam
            </p>
            {selectedListings.length > 1 ? (
              <p className="text-xs text-zinc-500">
                {formatTryPrice(selectedPack.fallbackPriceTry)} ×{" "}
                {selectedListings.length} ilan
              </p>
            ) : null}
          </div>
          <p className="text-3xl font-black tabular-nums tracking-tight text-zinc-950">
            {formatTryPrice(totalPrice)}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={submitting}
        onClick={onCheckout}
        className="mt-5 w-full rounded-xl bg-[#ffc400] px-4 py-4 text-base font-black text-black shadow-sm transition hover:bg-[#ffd24d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Yönlendiriliyor…" : "Güvenli ödemeye geç"}
      </button>
      <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
        Kart bilgileriniz PayTR güvenli ödeme sayfasında işlenir.
      </p>
    </aside>
  );
}
