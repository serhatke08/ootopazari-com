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

/** Scroll ile en fazla bu kadar sayfa (30×8=240). Egress / bot koruması. */
const MAX_AUTO_PAGES = 8;

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
  const [manualOnly, setManualOnly] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setItems(initialItems);
    setPage(1);
    setFeedExhausted(initialItems.length < pageSize);
    setManualOnly(false);
  }, [initialItems, pageSize]);

  const visible = filterHomeListingItems(items, filters ?? {});
  const hitPageCap = page >= MAX_AUTO_PAGES;
  const hasMore = !feedExhausted && !(hitPageCap && !manualOnly);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loading) return;
    if (feedExhausted) return;
    if (page >= MAX_AUTO_PAGES && !manualOnly) return;

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
      if (nextPage >= MAX_AUTO_PAGES) setManualOnly(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yükleme başarısız");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [feedExhausted, filters, loading, manualOnly, page, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || feedExhausted || manualOnly) return;
    if (page >= MAX_AUTO_PAGES) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { root: null, rootMargin: "480px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [feedExhausted, loadMore, manualOnly, page, items.length]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {visible.length === 0 ? (
        <p className="text-sm text-zinc-600">
          {!feedExhausted
            ? "Bu sayfada eşleşen ilan yok. Aşağı kaydırın."
            : "Aradığınız kriterlere uygun ilan bulunamadı."}
        </p>
      ) : (
        <div className="home-listings-grid">
          {visible.map((item, index) => {
            const inFirstRow = index < HOME_GRID_FIRST_ROW_SIZE;

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

      {!feedExhausted && !manualOnly ? (
        <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-2">
          <p className="text-xs text-zinc-500">
            {loading
              ? "Yükleniyor…"
              : `${items.length} / ${total} · aşağı kaydır`}
          </p>
          {error ? (
            <>
              <p className="text-xs text-red-600" role="alert">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void loadMore()}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800"
              >
                Tekrar dene
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {!feedExhausted && manualOnly ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-xs text-zinc-500">
            {items.length} ilan · devam için dokun (otomatik yük sınırlandı)
          </p>
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="rounded-lg border border-zinc-300 bg-white px-5 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
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

      {feedExhausted && total > pageSize ? (
        <p className="text-center text-xs text-zinc-500">
          Tüm ilanlar · {total} aktif
        </p>
      ) : null}
    </div>
  );
}
