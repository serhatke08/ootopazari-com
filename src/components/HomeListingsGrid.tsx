"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabasePublicEnv } from "@/lib/env";
import type {
  HomeListingCardItem,
  HomeListingsFeedFilters,
} from "@/lib/home-listings-feed-types";
import { HOME_LISTINGS_PAGE_SIZE } from "@/lib/home-listings-feed-types";
import { homeFeedFiltersToQueryString } from "@/lib/home-listings-feed-filters";
import { ListingCard } from "@/components/ListingCard";
import { buildListingSeoPath } from "@/lib/listing-seo";

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

  // URL değişince (şehir filtresi vb.) sunucu verisine dön; client arama override'ını sıfırla
  useEffect(() => {
    setItems(initialItems);
    setPage(1);
  }, [initialItems]);

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
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <ListingCard
            key={item.listing.id ?? String(item.listing.listing_number)}
            listing={item.listing}
            env={env}
            categoryName={item.categoryName}
            hideCategoryAndYear
            cityOnStatsRow
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
          />
        ))}
      </div>

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
