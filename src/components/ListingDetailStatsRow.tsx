"use client";

import { useEffect, useState } from "react";
import { ListingPriceHistoryButton } from "@/components/ListingPriceHistoryButton";
import { ListingPriceRatingDot } from "@/components/ListingPriceRatingDot";
import type { PriceHistoryEntry } from "@/lib/listing-price-history";
import type { PriceRatingSummary } from "@/lib/listing-price-ratings";

type Props = {
  listingId: string;
  initialFavorites: number;
  priceLabel: string;
  summary: PriceRatingSummary;
  loggedIn: boolean;
  priceHistory: PriceHistoryEntry[];
};

export function ListingDetailStatsRow({
  listingId,
  initialFavorites,
  priceLabel,
  summary,
  loggedIn,
  priceHistory,
}: Props) {
  const [favorites, setFavorites] = useState(initialFavorites);

  useEffect(() => {
    setFavorites(initialFavorites);
  }, [initialFavorites]);

  useEffect(() => {
    function onStats(event: Event) {
      const custom = event as CustomEvent<{
        listingId?: string;
        favorites?: number;
      }>;
      if (custom.detail?.listingId !== listingId) return;
      if (typeof custom.detail.favorites === "number") {
        setFavorites(custom.detail.favorites);
      }
    }
    window.addEventListener("listing:view-stats", onStats);
    return () => window.removeEventListener("listing:view-stats", onStats);
  }, [listingId]);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="inline-flex items-center gap-1.5 text-sm text-black">
        <HeartIcon />
        <span className="tabular-nums font-semibold">
          {favorites.toLocaleString("tr-TR")}
        </span>
      </span>
      <span className="inline-flex min-w-0 items-center gap-1">
        <ListingPriceRatingDot
          listingId={listingId}
          summary={summary}
          loggedIn={loggedIn}
          size="md"
          popoverPlacement="below"
        />
        <span className="text-sm font-bold tabular-nums text-black">
          {priceLabel}
        </span>
      </span>
      <ListingPriceHistoryButton
        history={priceHistory}
        popoverPlacement="below"
      />
    </div>
  );
}

function HeartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-5 w-5 text-[#e60000]"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3c1.836 0 3.486.784 4.625 2.031.14-.172.288-.335.445-.487 1.128-1.072 2.63-1.653 4.237-1.653 2.974 0 5.438 2.322 5.438 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.75.75 0 01-.704 0l-.003-.001z" />
    </svg>
  );
}
