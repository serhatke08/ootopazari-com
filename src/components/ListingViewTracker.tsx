"use client";

import { useEffect } from "react";

type ViewResponse = {
  ok?: boolean;
  views?: number;
  favorites?: number;
};

/** Detay mount oldukça sayacı tetikler; dedupe yok. */
export function ListingViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    if (!listingId) return;
    void fetch("/api/listings/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as ViewResponse;
      })
      .then((data) => {
        if (!data || typeof data.views !== "number") return;
        window.dispatchEvent(
          new CustomEvent("listing:view-stats", {
            detail: {
              listingId,
              views: data.views,
              favorites: data.favorites,
            },
          })
        );
      })
      .catch(() => {});
  }, [listingId]);

  return null;
}
