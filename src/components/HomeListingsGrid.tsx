"use client";

import { useCallback, useState } from "react";
import type { SupabasePublicEnv } from "@/lib/env";
import type {
  HomeListingCardItem,
  HomeListingsFeedFilters,
} from "@/lib/home-listings-feed-types";
import { HOME_LISTINGS_PAGE_SIZE } from "@/lib/home-listings-feed-types";
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
  const p = new URLSearchParams();
  if (filters.categoryId) p.set("category_id", filters.categoryId);
  if (filters.cityId) p.set("city_id", filters.cityId);
  if (filters.vehicleBrandId) p.set("vehicle_brand_id", filters.vehicleBrandId);
  if (filters.minPrice != null) p.set("min_price", String(filters.minPrice));
  if (filters.maxPrice != null) p.set("max_price", String(filters.maxPrice));
  if (filters.minYear != null) p.set("min_year", String(filters.minYear));
  if (filters.maxYear != null) p.set("max_year", String(filters.maxYear));
  if (filters.q) p.set("q", filters.q);
  if (filters.vehicleModel) p.set("vehicle_model", filters.vehicleModel);
  if (filters.vehicleBrandModelId) {
    p.set("vehicle_brand_model_id", filters.vehicleBrandModelId);
  }
  if (filters.bodyType) p.set("body_type", filters.bodyType);
  if (filters.bodyStyleId) p.set("body_style_id", filters.bodyStyleId);
  if (filters.engineId) p.set("engine_id", filters.engineId);
  if (filters.vehicleEnginePackageId) {
    p.set("vehicle_engine_package_id", filters.vehicleEnginePackageId);
  }
  const qs = p.toString();
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
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
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
            ownerHref={item.ownerHref}
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
