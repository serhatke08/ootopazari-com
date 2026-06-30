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
  /** Header araması — tam sayfa yenilemeden anında sonuç */
  queryOverride: string | null;
  applySearch: (q: string) => void;
  clearOverride: () => void;
};

const HomeSearchContext = createContext<HomeSearchContextValue | null>(null);

export function HomeSearchProvider({ children }: { children: ReactNode }) {
  const [queryOverride, setQueryOverride] = useState<string | null>(null);

  const applySearch = useCallback((q: string) => {
    const trimmed = q.trim();
    setQueryOverride(trimmed);
    const href = trimmed
      ? `/?q=${encodeURIComponent(trimmed)}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", href);
  }, []);

  const clearOverride = useCallback(() => {
    setQueryOverride(null);
  }, []);

  const value = useMemo(
    () => ({ queryOverride, applySearch, clearOverride }),
    [queryOverride, applySearch, clearOverride]
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
