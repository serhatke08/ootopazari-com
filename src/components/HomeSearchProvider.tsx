"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type HomeSearchContextValue = {
  queryOverride: string | null;
  /** Arama başlar başlamaz true — skeleton anında gösterilir */
  isSearching: boolean;
  pendingListingNo: string | null;
  applySearch: (q: string) => void;
  beginListingNumberSearch: (no: string) => void;
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
  const [pendingListingNo, setPendingListingNo] = useState<string | null>(null);

  const finishSearch = useCallback(() => {
    setIsSearching(false);
    setPendingListingNo(null);
  }, []);

  const applySearch = useCallback((q: string) => {
    const trimmed = q.trim();
    setIsSearching(true);
    setPendingListingNo(null);
    setQueryOverride(trimmed);
    const href = trimmed
      ? `/?q=${encodeURIComponent(trimmed)}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", href);
    scrollToListings();
  }, []);

  const beginListingNumberSearch = useCallback((no: string) => {
    setIsSearching(true);
    setPendingListingNo(no);
    setQueryOverride(no);
    window.history.replaceState(
      window.history.state,
      "",
      `/?q=${encodeURIComponent(no)}`
    );
    scrollToListings();
  }, []);

  const clearOverride = useCallback(() => {
    setQueryOverride(null);
    setIsSearching(false);
    setPendingListingNo(null);
  }, []);

  const value = useMemo(
    () => ({
      queryOverride,
      isSearching,
      pendingListingNo,
      applySearch,
      beginListingNumberSearch,
      finishSearch,
      clearOverride,
    }),
    [
      queryOverride,
      isSearching,
      pendingListingNo,
      applySearch,
      beginListingNumberSearch,
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
