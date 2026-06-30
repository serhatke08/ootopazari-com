"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SupabasePublicEnv } from "@/lib/env";
import type {
  HomeListingCardItem,
  HomeListingsFeedFilters,
} from "@/lib/home-listings-feed-types";
import { HOME_LISTINGS_PAGE_SIZE } from "@/lib/home-listings-feed-types";
import {
  buildBrandMap,
  buildCategoryMap,
  buildCityMap,
  type CategoryRow,
  type CityRow,
  type VehicleBrandRow,
} from "@/lib/listings-data";
import { homeListingsFeedHasFilters } from "@/lib/home-listings-feed-filters";
import { HomeListingsGrid } from "@/components/HomeListingsGrid";
import { HomeListingsGridSkeleton } from "@/components/HomeListingsGridSkeleton";
import { HomeSidebar } from "@/components/HomeSidebar";
import { TopCitySelect } from "@/components/TopCitySelect";
import { ListingFilters } from "@/components/ListingFilters";
import { useHomeSearch } from "@/components/HomeSearchProvider";
import { ADSENSE_HOME_SLOT } from "@/lib/adsense";
import { AdSenseUnit } from "@/components/AdSenseUnit";

type Props = {
  env: SupabasePublicEnv;
  categories: CategoryRow[];
  cities: CityRow[];
  brands: VehicleBrandRow[];
  initialItems: HomeListingCardItem[];
  initialTotal: number;
  initialLoggedIn: boolean;
  initialFilters: HomeListingsFeedFilters;
};

function filtersToApiQuery(
  filters: HomeListingsFeedFilters,
  qOverride: string | null
): string {
  const p = new URLSearchParams();
  if (filters.categoryId) p.set("category_id", filters.categoryId);
  if (filters.cityId) p.set("city_id", filters.cityId);
  if (filters.vehicleBrandId) p.set("vehicle_brand_id", filters.vehicleBrandId);
  if (filters.minPrice != null) p.set("min_price", String(filters.minPrice));
  if (filters.maxPrice != null) p.set("max_price", String(filters.maxPrice));
  if (filters.minYear != null) p.set("min_year", String(filters.minYear));
  if (filters.maxYear != null) p.set("max_year", String(filters.maxYear));
  if (filters.minKm != null) p.set("min_km", String(filters.minKm));
  if (filters.maxKm != null) p.set("max_km", String(filters.maxKm));
  const q = qOverride ?? filters.q;
  if (q) p.set("q", q);
  if (filters.vehicleModel) p.set("vehicle_model", filters.vehicleModel);
  if (filters.vehicleBrandModelId) {
    p.set("vehicle_brand_model_id", filters.vehicleBrandModelId);
  }
  if (filters.bodyType) p.set("body_type", filters.bodyType);
  if (filters.bodyStyleId) p.set("body_style_id", filters.bodyStyleId);
  if (filters.engineId) p.set("engine_id", filters.engineId);
  if (filters.vehicleEngineOther) p.set("engine_other", "1");
  if (filters.vehicleEnginePackageId) {
    p.set("vehicle_engine_package_id", filters.vehicleEnginePackageId);
  }
  return p.toString();
}

function filtersFromSearchParams(
  sp: URLSearchParams,
  qOverride: string | null
): HomeListingsFeedFilters {
  const get = (k: string) => sp.get(k)?.trim() || undefined;
  const num = (k: string) => {
    const v = get(k);
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    categoryId: get("category_id"),
    cityId: get("city_id"),
    vehicleBrandId: get("vehicle_brand_id"),
    minPrice: num("min_price"),
    maxPrice: num("max_price"),
    minYear: num("min_year"),
    maxYear: num("max_year"),
    minKm: num("min_km"),
    maxKm: num("max_km"),
    q: qOverride ?? get("q"),
    vehicleModel: get("vehicle_model"),
    vehicleBrandModelId: get("vehicle_brand_model_id"),
    bodyType: get("body_type"),
    bodyStyleId: get("body_style_id"),
    engineId: get("engine_id"),
    vehicleEngineOther: get("engine_other") === "1",
    vehicleEnginePackageId: get("vehicle_engine_package_id"),
  };
}

export function HomePageListings({
  env,
  categories,
  cities,
  brands,
  initialItems,
  initialTotal,
  initialLoggedIn,
  initialFilters,
}: Props) {
  const searchParams = useSearchParams();
  const homeSearch = useHomeSearch();
  const qOverride = homeSearch?.queryOverride ?? null;

  const spString = searchParams.toString();
  const activeFilters = useMemo(
    () => filtersFromSearchParams(new URLSearchParams(spString), qOverride),
    [spString, qOverride]
  );
  const apiQuery = useMemo(
    () => filtersToApiQuery(activeFilters, qOverride),
    [activeFilters, qOverride]
  );
  const serverQuery = useMemo(
    () => filtersToApiQuery(initialFilters, null),
    [initialFilters]
  );

  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchGen = useRef(0);

  const catMap = useMemo(() => buildCategoryMap(categories), [categories]);
  const cityMap = useMemo(() => buildCityMap(cities), [cities]);
  const brandMap = useMemo(() => buildBrandMap(brands), [brands]);
  const hasFilters = homeListingsFeedHasFilters(activeFilters);

  useEffect(() => {
    if (apiQuery === serverQuery) {
      setItems(initialItems);
      setTotal(initialTotal);
      setLoggedIn(initialLoggedIn);
      setLoading(false);
      setError(null);
      return;
    }

    const gen = ++fetchGen.current;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const qs = apiQuery ? `&${apiQuery}` : "";
        const res = await fetch(
          `/api/listings/feed?page=1&page_size=${HOME_LISTINGS_PAGE_SIZE}${qs}`
        );
        const data = (await res.json()) as {
          items?: HomeListingCardItem[];
          total?: number;
          loggedIn?: boolean;
          error?: string;
        };
        if (gen !== fetchGen.current) return;
        if (!res.ok) throw new Error(data.error ?? "Yükleme başarısız");
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        if (data.loggedIn != null) setLoggedIn(data.loggedIn);
      } catch (e) {
        if (gen !== fetchGen.current) return;
        setError(e instanceof Error ? e.message : "Yükleme başarısız");
        setItems([]);
        setTotal(0);
      } finally {
        if (gen === fetchGen.current) setLoading(false);
      }
    })();
  }, [
    apiQuery,
    serverQuery,
    initialItems,
    initialTotal,
    initialLoggedIn,
  ]);

  useEffect(() => {
    homeSearch?.clearOverride();
  }, [spString, homeSearch]);

  const categoryId = activeFilters.categoryId;
  const cityId = activeFilters.cityId;
  const vehicleBrandId = activeFilters.vehicleBrandId;

  return (
    <div
      id="ilanlar"
      className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6"
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-5">
        <aside className="hidden w-full shrink-0 lg:sticky lg:top-[5.5rem] lg:flex lg:h-[calc(100dvh-5.5rem)] lg:max-h-[calc(100dvh-5.5rem)] lg:min-h-0 lg:w-[min(280px,22vw)] lg:min-w-[240px] lg:max-w-[300px] lg:flex-col lg:overflow-hidden lg:self-start">
          <HomeSidebar categories={categories} />
        </aside>

        <div className="min-w-0 flex-1">
          <div
            className={`mb-4 flex flex-wrap items-center gap-2 ${
              hasFilters ? "justify-between" : "justify-end"
            }`}
          >
            {categoryId && catMap.get(categoryId)?.name ? (
              <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
                {catMap.get(categoryId)?.name}
              </h1>
            ) : null}
            <div className="flex items-center gap-2">
              <TopCitySelect cities={cities} />
              <ListingFilters />
            </div>
          </div>

          {hasFilters ? (
            <p className="mb-4 text-sm text-zinc-600">
              {loading ? "Aranıyor…" : `${total} sonuç`}
              {cityId && cityMap.get(cityId)?.name
                ? ` · ${cityMap.get(cityId)?.name}`
                : ""}
              {vehicleBrandId && brandMap.get(vehicleBrandId)?.name
                ? ` · ${brandMap.get(vehicleBrandId)?.name}`
                : ""}
              {activeFilters.vehicleModel
                ? ` · ${activeFilters.vehicleModel}`
                : ""}
              {activeFilters.bodyType ? ` · ${activeFilters.bodyType}` : ""}
              {activeFilters.vehicleEngineOther ? " · Diğer motor" : ""}
              {activeFilters.vehicleEnginePackageId ? " · paket filtresi" : ""}
              {activeFilters.q ? ` · “${activeFilters.q}”` : ""}
            </p>
          ) : null}

          <AdSenseUnit
            slot={ADSENSE_HOME_SLOT}
            className="mb-4 hidden sm:block"
            label="Sponsorlu"
          />

          {loading ? (
            <HomeListingsGridSkeleton count={10} />
          ) : error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500">
              {hasFilters
                ? "Bu filtrelere uygun ilan yok."
                : "Henüz ilan yok veya RLS engelliyor."}
            </p>
          ) : (
            <HomeListingsGrid
              key={apiQuery}
              initialItems={items}
              total={total}
              env={env}
              loggedIn={loggedIn}
              filters={activeFilters}
            />
          )}
        </div>
      </div>
    </div>
  );
}
