"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useHomeSearch } from "@/components/HomeSearchProvider";
import { ListingDetailSkeleton } from "@/components/ListingDetailSkeleton";

export function MainContentOverlay({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const homeSearch = useHomeSearch();
  const showListingSkeleton = homeSearch?.listingNavigationActive ?? false;

  useEffect(() => {
    if (showListingSkeleton && !pathname.startsWith("/ilan/")) {
      homeSearch?.endListingNavigation();
    }
  }, [pathname, showListingSkeleton, homeSearch]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {children}
      {showListingSkeleton ? (
        <div
          className="absolute inset-0 z-20 min-h-full overflow-y-auto bg-white"
          aria-busy="true"
          aria-live="polite"
          aria-label="İlan yükleniyor"
        >
          <ListingDetailSkeleton />
        </div>
      ) : null}
    </div>
  );
}
