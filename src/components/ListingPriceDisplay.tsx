"use client";

import { ListingPriceHistoryButton } from "@/components/ListingPriceHistoryButton";
import { ListingPriceRatingDot } from "@/components/ListingPriceRatingDot";
import type { PriceHistoryEntry } from "@/lib/listing-price-history";
import type { PriceRatingSummary } from "@/lib/listing-price-ratings";
import { priceRatingIndicatorColor } from "@/lib/listing-price-ratings";

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
  dotSize?: "sm" | "md";
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
  dotSize = "md",
}: Props) {
  const dotColor = priceRatingIndicatorColor(summary.average, summary.count);
  const hasRatings = summary.count > 0 && summary.average != null;
  const priceColor = overlay ? undefined : hasRatings ? dotColor : "#18181b";
  
  const basePriceCls = overlay
    ? "text-[0.6875rem] font-semibold tabular-nums leading-tight text-white drop-shadow-md sm:text-xs"
    : dotSize === "sm"
    ? "text-[13px] font-bold tabular-nums leading-tight sm:text-[15px]"
    : "text-sm font-bold tabular-nums sm:text-base md:text-lg";
  
  const priceCls = priceClassName ?? basePriceCls;

  const dateCls = overlay
    ? "text-[0.625rem] font-normal tabular-nums text-white/75 sm:text-[0.6875rem]"
    : "text-xs font-normal tabular-nums text-black/45 sm:text-sm";

  return (
    <div
      className={`flex min-w-0 items-center gap-x-0.5 gap-y-0.5 ${
        overlay ? "pointer-events-auto relative z-10 w-full" : ""
      }`}
      onClick={overlay ? (e) => e.stopPropagation() : undefined}
      onMouseDown={overlay ? (e) => e.stopPropagation() : undefined}
    >
      <ListingPriceRatingDot
        listingId={listingId}
        summary={summary}
        loggedIn={loggedIn}
        size={dotSize}
        popoverPlacement={popoverPlacement}
      />
      <span className={priceCls} style={{ color: priceColor }}>
        {priceLabel}
      </span>
      {showHistory ? (
        <ListingPriceHistoryButton
          history={priceHistory}
          popoverPlacement={popoverPlacement}
          overlay={overlay}
        />
      ) : null}
      {listingDate ? (
        <span className={`${dateCls} ml-auto shrink-0 text-right`}>
          {listingDate}
        </span>
      ) : null}
    </div>
  );
}
