"use client";

import { ListingPriceHistoryButton } from "@/components/ListingPriceHistoryButton";
import { ListingPriceRatingDot } from "@/components/ListingPriceRatingDot";
import type { PriceHistoryEntry } from "@/lib/listing-price-history";
import type { PriceRatingSummary } from "@/lib/listing-price-ratings";

type Props = {
  listingId: string;
  priceLabel: string;
  listingDate?: string | null;
  summary: PriceRatingSummary;
  loggedIn: boolean;
  priceHistory?: PriceHistoryEntry[];
  showHistory?: boolean;
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
  priceHistory = [],
  showHistory = false,
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
      className={`flex w-full min-w-0 items-center justify-between gap-x-2 gap-y-0.5 ${
        overlay ? "pointer-events-auto relative z-10" : ""
      }`}
      onClick={overlay ? (e) => e.stopPropagation() : undefined}
      onMouseDown={overlay ? (e) => e.stopPropagation() : undefined}
    >
      <div className="flex min-w-0 items-center gap-x-2">
        <ListingPriceRatingDot
          listingId={listingId}
          summary={summary}
          loggedIn={loggedIn}
          size={overlay ? "sm" : "md"}
          popoverPlacement={popoverPlacement}
        />
        <span className={priceCls}>{priceLabel}</span>
        {showHistory ? (
          <ListingPriceHistoryButton
            history={priceHistory}
            popoverPlacement={popoverPlacement}
            overlay={overlay}
          />
        ) : null}
      </div>
      {listingDate ? (
        <span className={`${dateCls} shrink-0 text-right`}>{listingDate}</span>
      ) : null}
    </div>
  );
}
