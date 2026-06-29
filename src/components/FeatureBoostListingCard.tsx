"use client";

import Image from "next/image";
import type { FeatureBoostListingOption } from "@/lib/feature-boost-listing";
import type { ListingBoostPaymentInfo } from "@/lib/feature-boost-payment-status";
import { boostPaymentStatusLabel } from "@/lib/feature-boost-payment-status";
import {
  formatFeatureBoostEndDisplay,
  parseListingDate,
} from "@/lib/listing-feature-boost";

type Props = {
  listing: FeatureBoostListingOption;
  selected: boolean;
  disabled: boolean;
  paymentInfo?: ListingBoostPaymentInfo | null;
  onToggle: () => void;
};

function formatPrice(price: number | null): string {
  if (price == null) return "Fiyat yok";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(price);
}

export function FeatureBoostListingCard({
  listing,
  selected,
  disabled,
  paymentInfo,
  onToggle,
}: Props) {
  const endDisplay = listing.featuredUntil
    ? formatFeatureBoostEndDisplay(parseListingDate(listing.featuredUntil))
    : null;
  const purchasedLabel = boostPaymentStatusLabel(paymentInfo ?? undefined);

  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        aria-pressed={selected}
        className={`group flex w-full gap-3 overflow-hidden rounded-2xl border p-3 text-left transition sm:gap-4 sm:p-4 ${
          disabled
            ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-60"
            : selected
              ? "border-[#ffc400] bg-gradient-to-br from-amber-50 to-white shadow-md ring-2 ring-[#ffc400]/30"
              : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
        }`}
      >
        <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:h-28 sm:w-36">
          {listing.coverImageUrl ? (
            <Image
              src={listing.coverImageUrl}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="144px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-400">
              Görsel yok
            </div>
          )}
          {selected ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffc400] text-sm font-black text-black">
                ✓
              </span>
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-bold text-zinc-900 sm:text-base">
                {listing.title}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                #{listing.listingNumber}
                {listing.cityName ? ` · ${listing.cityName}` : ""}
              </p>
            </div>
            <p className="shrink-0 text-sm font-bold tabular-nums text-zinc-900">
              {formatPrice(listing.price)}
            </p>
          </div>

          {listing.blockReason ? (
            <p className="mt-2 rounded-lg bg-amber-100/80 px-2.5 py-1.5 text-xs text-amber-900">
              {listing.blockReason}
            </p>
          ) : listing.isBoostActive && endDisplay ? (
            <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#ffc400] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
                  Öne çıkıyor
                </span>
                {endDisplay.remainingLabel ? (
                  <span className="text-xs font-semibold text-amber-800">
                    {endDisplay.remainingLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-xs font-medium text-amber-950/70">
                Kampanya bitişi
              </p>
              <p className="text-sm font-bold leading-snug text-amber-950">
                {endDisplay.dateLine}
              </p>
              <p className="text-xs font-semibold tabular-nums text-amber-800">
                saat {endDisplay.timeLine}
              </p>
              {listing.packDays > 0 ? (
                <p className="mt-1 text-[11px] text-amber-800/90">
                  {listing.packDays} günlük pulse paketi
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              Öne çıkarmaya uygun
            </p>
          )}

          {purchasedLabel ? (
            <p className="mt-2 text-xs font-medium text-zinc-600">
              Son ödeme: {purchasedLabel}
            </p>
          ) : null}
        </div>
      </button>
    </li>
  );
}
