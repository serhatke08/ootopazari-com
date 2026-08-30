"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabasePublicEnv } from "@/lib/env";
import type {
  HomeListingCardItem,
  HomeListingsFeedFilters,
} from "@/lib/home-listings-feed-types";
import { HOME_LISTINGS_PAGE_SIZE } from "@/lib/home-listings-feed-types";
import { HOME_GRID_FIRST_ROW_SIZE } from "@/lib/home-grid-image-load";
import { homeFeedFiltersToQueryString } from "@/lib/home-listings-feed-filters";
import { filterHomeListingItems } from "@/lib/home-filter-client";
import { ListingCard } from "@/components/ListingCard";
import { buildListingSeoPath } from "@/lib/listing-seo";

type Props = {
  initialItems: HomeListingCardItem[];
  total: number;
  pageSize?: number;
  env: SupabasePublicEnv;
  loggedIn: boolean;
  filters?: HomeListingsFeedFilters;
  /** Ana grid ilk sırası bitince (acil vitrinini geciktirmek için). */
  onFirstRowComplete?: () => void;
};

function filtersToQuery(filters: HomeListingsFeedFilters | undefined): string {
  if (!filters) return "";
  const qs = homeFeedFiltersToQueryString(filters);
  return qs ? `&${qs}` : "";
}

export function HomeListingsGrid({
  initialItems,
  total,
  pageSize = HOME_LISTINGS_PAGE_SIZE,
  env,
  loggedIn: initialLoggedIn,
  filters,
  onFirstRowComplete,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sequentialReady, setSequentialReady] = useState(0);
  const firstRowNotifiedRef = useRef(false);

  // URL değişince (şehir filtresi vb.) sunucu verisine dön; client arama override'ını sıfırla
  useEffect(() => {
    setItems(initialItems);
    setPage(1);
    setSequentialReady(0);
    firstRowNotifiedRef.current = false;
  }, [initialItems]);

  useEffect(() => {
    if (
      sequentialReady >= HOME_GRID_FIRST_ROW_SIZE &&
      !firstRowNotifiedRef.current
    ) {
      firstRowNotifiedRef.current = true;
      onFirstRowComplete?.();
    }
  }, [sequentialReady, onFirstRowComplete]);

  const handleCoverLoaded = useCallback((index: number) => {
    setSequentialReady((ready) => {
      if (index !== ready) return ready;
      return ready + 1;
    });
  }, []);

  const visible = filterHomeListingItems(items, filters ?? {});
  const hasMore = items.length < total;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yükleme başarısız");
    } finally {
      setLoading(false);
    }
  }, [filters, hasMore, loading, page, pageSize]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {visible.length === 0 ? (
        <p className="text-sm text-zinc-600">
          {hasMore
            ? "Bu sayfada eşleşen ilan yok. Daha fazla yükleyin."
            : "Aradığınız kriterlere uygun ilan bulunamadı."}
        </p>
      ) : (
      <div className="home-listings-grid">
        {visible.map((item, index) => {
          const inFirstRow = index < HOME_GRID_FIRST_ROW_SIZE;
          const coverDefer =
            inFirstRow && index > 0 && index > sequentialReady;

          return (
          <ListingCard
            key={item.listing.id ?? String(item.listing.listing_number)}
            listing={item.listing}
            env={env}
            categoryName={item.categoryName}
            hideCategoryAndYear
            cityOnStatsRow
            showFavorite={false}
            cityDisplayName={item.cityDisplayName}
            stats={item.stats}
            loggedIn={loggedIn}
            favorited={item.favorited}
            ownerName={item.ownerName}
            ownerAvatarSrc={item.ownerAvatarSrc}
            ownerHref={buildListingSeoPath(
              item.listing.listing_number != null
                ? String(item.listing.listing_number)
                : null,
              typeof item.listing.title === "string" ? item.listing.title : null
            )}
            priceRating={item.priceRating}
            coverPriority={index === 0}
            coverFastPath={inFirstRow}
            coverDefer={coverDefer}
            coverFetchPriority={inFirstRow ? "high" : "auto"}
            onCoverLoaded={
              inFirstRow ? () => handleCoverLoaded(index) : undefined
            }
          />
          );
        })}
      </div>
      )}

      {hasMore ? (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="rounded-lg border border-zinc-300 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Yükleniyor…" : "Daha fazla yükle"}
          </button>
          <p className="text-xs text-zinc-500">
            {items.length} / {total} ilan gösteriliyor
          </p>
          {error ? (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : total > pageSize ? (
        <p className="text-center text-xs text-zinc-500">
          Tüm ilanlar yüklendi ({total})
        </p>
      ) : null}
    </div>
  );
}
