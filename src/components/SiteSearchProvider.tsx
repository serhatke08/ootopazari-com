"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SiteSearchContextValue = {
  /** Ana sayfada metin araması — sayfa yenilemeden */
  homeTextQuery: string | undefined;
  setHomeTextQuery: (q: string) => void;
  resetHomeTextQuery: () => void;
};

const SiteSearchContext = createContext<SiteSearchContextValue | null>(null);

export function SiteSearchProvider({ children }: { children: ReactNode }) {
  const [homeTextQuery, setHomeTextQueryState] = useState<string | undefined>(
    undefined
  );

  const setHomeTextQuery = useCallback((q: string) => {
    const trimmed = q.trim();
    setHomeTextQueryState(trimmed);
    const href = trimmed
      ? `/?q=${encodeURIComponent(trimmed)}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", href);
    requestAnimationFrame(() => {
      document.getElementById("ilanlar")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const resetHomeTextQuery = useCallback(() => {
    setHomeTextQueryState(undefined);
  }, []);

  const value = useMemo(
    () => ({ homeTextQuery, setHomeTextQuery, resetHomeTextQuery }),
    [homeTextQuery, setHomeTextQuery, resetHomeTextQuery]
  );

  return (
    <SiteSearchContext.Provider value={value}>
      {children}
    </SiteSearchContext.Provider>
  );
}

export function useSiteSearch() {
  return useContext(SiteSearchContext);
}
