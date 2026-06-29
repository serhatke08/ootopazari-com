"use client";

import Image from "next/image";
import type { FeatureBoostListingOption } from "@/lib/feature-boost-listing";
import type { ListingBoostPaymentInfo } from "@/lib/feature-boost-payment-status";
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
  if (price == null) return "—";
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
  onToggle,
}: Props) {
  const endDisplay = listing.featuredUntil
    ? formatFeatureBoostEndDisplay(parseListingDate(listing.featuredUntil))
    : null;

  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        aria-pressed={selected}
        className={`group relative flex h-full w-full flex-col overflow-hidden rounded-xl border text-left transition ${
          disabled
            ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-55"
            : selected
              ? "border-[#ffc400] bg-white shadow-md ring-2 ring-[#ffc400]/40"
              : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
        }`}
      >
        <div className="relative aspect-[4/3] w-full bg-zinc-100">
          {listing.coverImageUrl ? (
            <Image
              src={listing.coverImageUrl}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-400">
              Görsel yok
            </div>
          )}

          {listing.isBoostActive ? (
            <span className="absolute left-2 top-2 rounded-md bg-[#ffc400] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black shadow-sm">
              Öne çıkıyor
            </span>
          ) : null}

          {selected ? (
            <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#ffc400] text-sm font-black text-black shadow-md">
              ✓
            </span>
          ) : (
            <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/90 bg-black/25 text-transparent opacity-0 transition group-hover:opacity-100 group-hover:text-white/80" />
          )}
        </div>

        <div className="flex flex-1 flex-col p-2.5 sm:p-3">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-zinc-900">
            {listing.title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">
            #{listing.listingNumber}
            {listing.cityName ? ` · ${listing.cityName}` : ""}
          </p>
          <p className="mt-1.5 text-sm font-black tabular-nums text-zinc-950">
            {formatPrice(listing.price)}
          </p>

          {listing.blockReason ? (
            <p className="mt-2 line-clamp-2 text-[11px] font-medium text-amber-800">
              {listing.blockReason}
            </p>
          ) : listing.isBoostActive && endDisplay ? (
            <p className="mt-2 text-[11px] font-semibold leading-snug text-amber-800">
              {endDisplay.remainingLabel ?? "Aktif"}
              <span className="mt-0.5 block font-medium text-amber-700/90">
                {endDisplay.dateLine}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-[11px] font-semibold text-emerald-700">
              Uygun
            </p>
          )}
        </div>
      </button>
    </li>
  );
}
