"use client";

import { useEffect } from "react";
import { useHomeSearch } from "@/components/HomeSearchProvider";

/** İlan detay yüklendiğinde navigasyon overlay iskeletini kaldırır. */
export function ListingDetailReadyMarker() {
  const homeSearch = useHomeSearch();

  useEffect(() => {
    homeSearch?.endListingNavigation();
  }, [homeSearch]);

  return null;
}
