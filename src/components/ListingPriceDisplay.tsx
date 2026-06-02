"use client";

import { ListingPriceRatingDot } from "@/components/ListingPriceRatingDot";
import type { PriceRatingSummary } from "@/lib/listing-price-ratings";

type Props = {
  listingId: string;
  priceLabel: string;
  listingDate?: string | null;
  summary: PriceRatingSummary;
  loggedIn: boolean;
  /** Kart görseli üzerinde beyaz metin */
  overlay?: boolean;
  priceClassName?: string;
  popoverPlacement?: "above" | "below";
};

export function ListingPriceDisplay({
  listingId,
  priceLabel,
  listingDate,
  summary,
  loggedIn,
  overlay = false,
  priceClassName,
  popoverPlacement = "above",
}: Props) {
  const priceCls =
    priceClassName ??
    (overlay
      ? "text-[0.6875rem] font-semibold tabular-nums leading-tight text-white drop-shadow-md sm:text-xs"
      : "text-sm font-bold tabular-nums text-emerald-700 sm:text-base md:text-lg");

  const dateCls = overlay
    ? "text-[0.625rem] font-normal tabular-nums text-white/75 sm:text-[0.6875rem]"
    : "text-xs font-normal tabular-nums text-black/45 sm:text-sm";

  return (
    <div
      className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 ${
        overlay ? "pointer-events-auto relative z-10" : ""
      }`}
      onClick={overlay ? (e) => e.stopPropagation() : undefined}
      onMouseDown={overlay ? (e) => e.stopPropagation() : undefined}
    >
      <ListingPriceRatingDot
        listingId={listingId}
        summary={summary}
        loggedIn={loggedIn}
        size={overlay ? "sm" : "md"}
        popoverPlacement={popoverPlacement}
      />
      <span className={priceCls}>{priceLabel}</span>
      {listingDate ? (
        <span className={dateCls}>{listingDate}</span>
      ) : null}
    </div>
  );
}
