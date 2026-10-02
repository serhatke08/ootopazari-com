"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabasePublicEnv } from "@/lib/env";
import type {
  HomeListingCardItem,
  HomeListingsFeedFilters,
} from "@/lib/home-listings-feed-types";
import { HOME_LISTINGS_PAGE_SIZE } from "@/lib/home-listings-feed-types";
import {
  HOME_GRID_DESKTOP_COLS,
  HOME_GRID_FIRST_ROW_SIZE,
  HOME_GRID_INITIAL_ROWS,
} from "@/lib/home-grid-image-load";
import { homeFeedFiltersToQueryString } from "@/lib/home-listings-feed-filters";
import { filterHomeListingItems } from "@/lib/home-filter-client";
import { ListingCard } from "@/components/ListingCard";

type Props = {
  initialItems: HomeListingCardItem[];
  total: number;
  pageSize?: number;
  env: SupabasePublicEnv;
  loggedIn: boolean;
  filters?: HomeListingsFeedFilters;
};

function filtersToQuery(filters: HomeListingsFeedFilters | undefined): string {
  if (!filters) return "";
  const qs = homeFeedFiltersToQueryString(filters);
  return qs ? `&${qs}` : "";
}

function measureGridCols(el: HTMLElement | null): number {
  if (!el) return HOME_GRID_FIRST_ROW_SIZE;
  const raw = getComputedStyle(el).gridTemplateColumns;
  const n = raw.split(/\s+/).filter(Boolean).length;
  return n > 0 ? n : HOME_GRID_FIRST_ROW_SIZE;
}

export function HomeListingsGrid({
  initialItems,
  total,
  pageSize = HOME_LISTINGS_PAGE_SIZE,
  env,
  loggedIn: initialLoggedIn,
  filters,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedExhausted, setFeedExhausted] = useState(
    initialItems.length < pageSize
  );
  const [cols, setCols] = useState(HOME_GRID_FIRST_ROW_SIZE);
  const [visibleCount, setVisibleCount] = useState(
    HOME_GRID_INITIAL_ROWS * HOME_GRID_FIRST_ROW_SIZE
  );
  const gridRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const expandedRef = useRef(false);

  useEffect(() => {
    expandedRef.current = false;
    setItems(initialItems);
    setPage(1);
    setFeedExhausted(initialItems.length < pageSize);
    setVisibleCount(HOME_GRID_INITIAL_ROWS * Math.max(cols, 1));
  }, [initialItems, pageSize]);

  useEffect(() => {
    const el = gridRef.current;
    const apply = () => {
      const n = measureGridCols(el);
      setCols((prev) => (prev === n ? prev : n));
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [items.length]);

  useEffect(() => {
    if (!expandedRef.current) {
      setVisibleCount(HOME_GRID_INITIAL_ROWS * Math.max(cols, 1));
    }
  }, [cols]);

  const filtered = filterHomeListingItems(items, filters ?? {});
  const shown = filtered.slice(0, visibleCount);
  const hasHiddenLocal = filtered.length > visibleCount;
  const hasMore = hasHiddenLocal || !feedExhausted;

  const fetchNextPage = useCallback(async () => {
    if (loadingRef.current || loading) return false;
    if (feedExhausted) return false;

    loadingRef.current = true;
    setLoading(true);
    setError(null);
    const nextPage = page + 1;
    try {
      const res = await fetch(
        `/api/listings/feed?page=${nextPage}&page_size=${pageSize}${filtersToQuery(filters)}`
      );
      const data = (await res.json()) as {
        items?: HomeListingCardItem[];
        loggedIn?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Yükleme başarısız");
      }
      const newItems = data.items ?? [];
      if (newItems.length < pageSize) setFeedExhausted(true);
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.listing.id).filter(Boolean));
        const merged = [...prev];
        for (const item of newItems) {
          const id = item.listing.id;
          if (id && seen.has(id)) continue;
          if (id) seen.add(id);
          merged.push(item);
        }
        return merged;
      });
      if (data.loggedIn != null) setLoggedIn(data.loggedIn);
      setPage(nextPage);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yükleme başarısız");
      return false;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [feedExhausted, filters, loading, page, pageSize]);

  const loadMore = useCallback(async () => {
    expandedRef.current = true;
    const step = HOME_GRID_INITIAL_ROWS * Math.max(cols, 1);
    if (hasHiddenLocal) {
      setVisibleCount((v) => v + step);
      return;
    }
    if (feedExhausted) return;
    const ok = await fetchNextPage();
    if (ok) setVisibleCount((v) => v + step);
  }, [cols, feedExhausted, fetchNextPage, hasHiddenLocal]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Aradığınız kriterlere uygun ilan bulunamadı.
        </p>
      ) : (
        <div ref={gridRef} className="home-listings-grid">
          {shown.map((item, index) => {
            const inFirstRow = index < Math.max(cols, HOME_GRID_FIRST_ROW_SIZE);

            return (
              <ListingCard
                key={item.listing.id ?? String(item.listing.listing_number)}
                listing={item.listing}
                env={env}
                categoryName={item.categoryName}
                brandName={item.brandName}
                hideCategoryAndYear
                cityOnStatsRow
                showFavorite={false}
                cityDisplayName={item.cityDisplayName}
                stats={item.stats}
                loggedIn={loggedIn}
                favorited={item.favorited}
                ownerName={item.ownerName}
                ownerAvatarSrc={item.ownerAvatarSrc}
                ownerHref={item.ownerHref}
                priceRating={item.priceRating}
                coverPriority={inFirstRow}
                coverFastPath={inFirstRow}
                coverFetchPriority={inFirstRow ? "high" : "auto"}
              />
            );
          })}
        </div>
      )}

      {hasMore ? (
        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
          >
            {loading ? "Yükleniyor…" : "Daha fazla yükle"}
          </button>
          {error ? (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="text-center text-xs text-zinc-500 sm:text-sm">
        Toplam <span className="font-semibold text-zinc-700">{total}</span> ilan
        {shown.length > 0 && shown.length < total
          ? ` · ${shown.length} gösteriliyor`
          : null}
      </p>
    </div>
  );
}
