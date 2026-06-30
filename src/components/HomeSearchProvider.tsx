"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type HomeSearchContextValue = {
  queryOverride: string | null;
  isSearching: boolean;
  /** İlan detayına giderken tam sayfa detay iskeleti */
  listingNavigationActive: boolean;
  applySearch: (q: string) => void;
  navigateToListing: (router: AppRouterInstance, no: string) => void;
  endListingNavigation: () => void;
  finishSearch: () => void;
  clearOverride: () => void;
};

const HomeSearchContext = createContext<HomeSearchContextValue | null>(null);

function scrollToListings() {
  requestAnimationFrame(() => {
    document.getElementById("ilanlar")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

export function HomeSearchProvider({ children }: { children: ReactNode }) {
  const [queryOverride, setQueryOverride] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [listingNavigationActive, setListingNavigationActive] = useState(false);

  const endListingNavigation = useCallback(() => {
    setListingNavigationActive(false);
  }, []);

  const finishSearch = useCallback(() => {
    setIsSearching(false);
  }, []);

  const navigateToListing = useCallback(
    (router: AppRouterInstance, no: string) => {
      setListingNavigationActive(true);
      setIsSearching(false);
      setQueryOverride(null);
      router.push(`/ilan/${no}`);
    },
    []
  );

  const applySearch = useCallback((q: string) => {
    const trimmed = q.trim();
    setIsSearching(true);
    setQueryOverride(trimmed);
    const href = trimmed
      ? `/?q=${encodeURIComponent(trimmed)}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", href);
    scrollToListings();
  }, []);

  const clearOverride = useCallback(() => {
    setQueryOverride(null);
    setIsSearching(false);
  }, []);

  useEffect(() => {
    if (!listingNavigationActive) return;
    const t = window.setTimeout(() => setListingNavigationActive(false), 15000);
    return () => window.clearTimeout(t);
  }, [listingNavigationActive]);

  const value = useMemo(
    () => ({
      queryOverride,
      isSearching,
      listingNavigationActive,
      applySearch,
      navigateToListing,
      endListingNavigation,
      finishSearch,
      clearOverride,
    }),
    [
      queryOverride,
      isSearching,
      listingNavigationActive,
      applySearch,
      navigateToListing,
      endListingNavigation,
      finishSearch,
      clearOverride,
    ]
  );

  return (
    <HomeSearchContext.Provider value={value}>
      {children}
    </HomeSearchContext.Provider>
  );
}

export function useHomeSearch() {
  return useContext(HomeSearchContext);
}
