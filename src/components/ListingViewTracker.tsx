"use client";

import { useEffect } from "react";

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
    }).catch(() => {});
  }, [listingId]);

  return null;
}
