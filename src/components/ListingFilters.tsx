"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CategoryRow } from "@/lib/listings-data";
import type { HomeListingsFeedFilters } from "@/lib/home-listings-feed-types";
import { homeFeedFiltersToQueryString } from "@/lib/home-listings-feed-filters";
import {
  clearHomeSheetFilters,
  countHomeFilterBadges,
} from "@/lib/home-filter-client";
import { HomeFilterSheet } from "@/components/HomeFilterSheet";

export function pushHomeFeedFilters(
  router: { push: (href: string) => void },
  next: HomeListingsFeedFilters,
  basePath = "/",
  extraParams?: Record<string, string>
) {
  const qs = homeFeedFiltersToQueryString(next);
  const p = new URLSearchParams(qs);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) p.set(k, v);
    }
  }
  const str = p.toString();
  router.push(str ? `${basePath}?${str}` : basePath);
}

export function ListingFilters({
  categories,
  applied,
  basePath = "/",
  extraParams,
  variant = "chip",
}: {
  categories: CategoryRow[];
  applied: HomeListingsFeedFilters;
  basePath?: string;
  extraParams?: Record<string, string>;
  variant?: "chip" | "appbar";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const badge = countHomeFilterBadges(applied);

  function apply(next: HomeListingsFeedFilters) {
    pushHomeFeedFilters(router, next, basePath, extraParams);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "appbar"
            ? "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-white"
            : `flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium shadow-sm transition sm:text-xs ${
                badge > 0
                  ? "border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-400"
              }`
        }
        aria-label="Filtrele"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg
          className={variant === "appbar" ? "h-5 w-5" : "h-3.5 w-3.5"}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        {variant === "chip" ? "Filtrele" : null}
        {badge > 0 ? (
          <span
            className={
              variant === "appbar"
                ? "absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-white"
                : "flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white"
            }
          >
            {variant === "chip" ? badge : null}
          </span>
        ) : null}
      </button>
      <HomeFilterSheet
        open={open}
        onClose={() => setOpen(false)}
        categories={categories}
        applied={applied}
        onApply={apply}
        onReset={() => apply(clearHomeSheetFilters(applied))}
      />
    </>
  );
}
