"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  homeFeedFiltersToQueryString,
  homeListingsFeedHasFilters,
  parseCityIdsParam,
  parseHomeListingsSort,
} from "@/lib/home-listings-feed-filters";
import {
  countHomeFilterBadges,
  formatHomeFilterRangeChip,
} from "@/lib/home-filter-client";
import { HomeListingsGrid } from "@/components/HomeListingsGrid";
import { HomeListingsGridSkeleton } from "@/components/HomeListingsGridSkeleton";
import { HomeSidebar } from "@/components/HomeSidebar";
import { HomeAcilRail } from "@/components/HomeAcilRail";
import { TopCitySelect } from "@/components/TopCitySelect";
import { ListingSortSelect } from "@/components/ListingSortSelect";
import {
  ListingFilters,
  pushHomeFeedFilters,
} from "@/components/ListingFilters";
import { useSiteSearch } from "@/components/SiteSearchProvider";
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
  /** Ana sayfa ilk sıra: acil vitrini (en fazla 3). */
  acilItems?: HomeListingCardItem[];
};

function filtersFromUrl(
  sp: URLSearchParams,
  textQ: string | undefined
): HomeListingsFeedFilters {
  const get = (k: string) => sp.get(k)?.trim() || undefined;
  const num = (k: string) => {
    const v = get(k);
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const cityIds = parseCityIdsParam(get("city_id"));
  const brandIds = parseCityIdsParam(get("vehicle_brand_id"));
  const extraModels = parseCityIdsParam(get("vehicle_models"));
  const vehicleModel = get("vehicle_model");
  const vehicleModels = [
    ...new Set(
      [...extraModels, vehicleModel ?? ""].map((s) => s.trim()).filter(Boolean)
    ),
  ];
  const sort = parseHomeListingsSort(get("sort"));
  return {
    categoryId: get("category_id"),
    cityId: cityIds[0],
    cityIds: cityIds.length > 0 ? cityIds : undefined,
    sort: sort === "newest" ? undefined : sort,
    vehicleBrandId: brandIds[0],
    vehicleBrandIds: brandIds.length > 0 ? brandIds : undefined,
    vehicleModel,
    vehicleModels: vehicleModels.length > 0 ? vehicleModels : undefined,
    fuelType: get("fuel"),
    transmissionType: get("transmission"),
    hasPhoto: get("has_photo") === "1" || undefined,
    vehiclesOnly: get("vehicles_only") === "1" || undefined,
    minPrice: num("min_price"),
    maxPrice: num("max_price"),
    minYear: num("min_year"),
    maxYear: num("max_year"),
    minKm: num("min_km"),
    maxKm: num("max_km"),
    q: textQ !== undefined ? textQ || undefined : get("q"),
    vehicleBrandModelId: get("vehicle_brand_model_id"),
    bodyType: get("body_type"),
    bodyStyleId: get("body_style_id"),
    engineId: get("engine_id"),
    vehicleEngineOther: get("engine_other") === "1" || undefined,
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
  acilItems = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteSearch = useSiteSearch();
  const resetHomeTextQuery = siteSearch?.resetHomeTextQuery;

  const spString = searchParams.toString();
  const prevSpRef = useRef(spString);

  const textQ =
    siteSearch?.homeTextQuery !== undefined
      ? siteSearch.homeTextQuery
      : undefined;

  const activeFilters = useMemo(
    () => filtersFromUrl(new URLSearchParams(spString), textQ),
    [spString, textQ]
  );

  const activeQuery = useMemo(
    () => homeFeedFiltersToQueryString(activeFilters),
    [activeFilters]
  );
  const serverQuery = useMemo(
    () => homeFeedFiltersToQueryString(initialFilters),
    [initialFilters]
  );

  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [settledQuery, setSettledQuery] = useState(serverQuery);
  const [error, setError] = useState<string | null>(null);
  const fetchGen = useRef(0);

  const serverSnapshotRef = useRef({
    items: initialItems,
    total: initialTotal,
    loggedIn: initialLoggedIn,
  });

  const catMap = useMemo(() => buildCategoryMap(categories), [categories]);
  const cityMap = useMemo(() => buildCityMap(cities), [cities]);
  const brandMap = useMemo(() => buildBrandMap(brands), [brands]);
  const hasFilters = homeListingsFeedHasFilters(activeFilters);
  const sheetBadge = countHomeFilterBadges(activeFilters);
  const showSkeleton = activeQuery !== settledQuery;

  useEffect(() => {
    serverSnapshotRef.current = {
      items: initialItems,
      total: initialTotal,
      loggedIn: initialLoggedIn,
    };
    if (activeQuery === serverQuery) {
      setSettledQuery(serverQuery);
      setItems(initialItems);
      setTotal(initialTotal);
      setLoggedIn(initialLoggedIn);
      setError(null);
    }
  }, [initialItems, initialTotal, initialLoggedIn, serverQuery, activeQuery]);

  useEffect(() => {
    if (prevSpRef.current === spString) return;
    prevSpRef.current = spString;
    resetHomeTextQuery?.();
  }, [spString, resetHomeTextQuery]);

  useEffect(() => {
    if (activeQuery === serverQuery) return;

    const gen = ++fetchGen.current;
    setError(null);

    void (async () => {
      try {
        const qs = activeQuery ? `&${activeQuery}` : "";
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
        setSettledQuery(activeQuery);
      } catch (e) {
        if (gen !== fetchGen.current) return;
        setError(e instanceof Error ? e.message : "Yükleme başarısız");
        setItems([]);
        setTotal(0);
        setSettledQuery(activeQuery);
      }
    })();
  }, [activeQuery, serverQuery]);

  const categoryId = activeFilters.categoryId;
  const cityIds = activeFilters.cityIds ?? [];
  const vehicleBrandId = activeFilters.vehicleBrandId;
  const heading =
    categoryId && catMap.get(categoryId)?.name
      ? catMap.get(categoryId)?.name
      : "İlanlar";
  const citySummary = (() => {
    if (cityIds.length === 0) return "";
    const names = cityIds
      .map((id) => cityMap.get(id)?.name)
      .filter((n): n is string => Boolean(n));
    if (names.length === 0) return "";
    if (names.length <= 2) return names.join(", ");
    return `${names.length} şehir`;
  })();

  return (
    <div
      id="ilanlar"
      className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6"
    >
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-4 lg:gap-5">
        <aside className="hidden w-full shrink-0 md:sticky md:top-[5.5rem] md:flex md:h-[calc(100dvh-5.5rem)] md:max-h-[calc(100dvh-5.5rem)] md:min-h-0 md:w-[min(220px,30vw)] md:min-w-[180px] md:max-w-[240px] md:flex-col md:overflow-hidden md:self-start lg:w-[min(280px,22vw)] lg:min-w-[240px] lg:max-w-[300px]">
          <HomeSidebar categories={categories} />
        </aside>

        <div className="min-w-0 flex-1">
          <AdSenseUnit
            slot={ADSENSE_HOME_SLOT}
            className="mb-4 hidden sm:block"
            label="Sponsorlu"
          />

          {!hasFilters ? (
            <HomeAcilRail
              items={acilItems}
              env={env}
              loggedIn={loggedIn}
            />
          ) : null}

          <div className="mb-3 flex items-center gap-1.5">
            <h2 className="mr-auto shrink-0 text-sm font-bold text-zinc-900 sm:text-base">
              {heading}
            </h2>
            <div className="flex min-w-0 items-center gap-1">
              <TopCitySelect cities={cities} />
              <ListingSortSelect />
              <ListingFilters categories={categories} applied={activeFilters} />
            </div>
          </div>

          {hasFilters ? (
            <p className="mb-3 text-sm text-zinc-600">
              {showSkeleton ? "Aranıyor…" : `${total} sonuç`}
              {citySummary ? ` · ${citySummary}` : ""}
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

          {sheetBadge > 0 && !showSkeleton ? (
            <HomeFilterChips
              filters={activeFilters}
              categories={categories}
              brands={brands}
              onChange={(next) => pushHomeFeedFilters(router, next)}
            />
          ) : null}

          {showSkeleton ? (
            <HomeListingsGridSkeleton count={10} />
          ) : error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-600">
              {hasFilters
                ? "Aradığınız kriterlere uygun ilan bulunamadı."
                : "Şu an yayında ilan bulunmuyor."}
            </p>
          ) : (
            <HomeListingsGrid
              key={activeQuery}
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

function Chip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex max-w-full items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-800 hover:border-zinc-400 hover:bg-zinc-100"
    >
      <span className="truncate">{label}</span>
      <span className="text-zinc-400" aria-hidden>
        ×
      </span>
    </button>
  );
}

function HomeFilterChips({
  filters,
  categories,
  brands,
  onChange,
}: {
  filters: HomeListingsFeedFilters;
  categories: CategoryRow[];
  brands: VehicleBrandRow[];
  onChange: (next: HomeListingsFeedFilters) => void;
}) {
  const brandIds = [
    ...new Set(
      [...(filters.vehicleBrandIds ?? []), filters.vehicleBrandId ?? ""].filter(
        Boolean
      )
    ),
  ];
  const models = [
    ...new Set(
      [...(filters.vehicleModels ?? []), filters.vehicleModel ?? ""]
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
  const catName =
    categories.find((c) => c.id === filters.categoryId)?.name ?? "Kategori";
  const brandNames = brandIds
    .map((id) => brands.find((b) => b.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  const brandLabel =
    brandNames.length === 1
      ? brandNames[0]
      : brandNames.length > 1
        ? brandNames.join(", ")
        : brandIds.length > 0
          ? `${brandIds.length} marka`
          : "";
  const priceLabel = formatHomeFilterRangeChip(
    filters.minPrice,
    filters.maxPrice,
    "₺"
  );
  const yearLabel = formatHomeFilterRangeChip(filters.minYear, filters.maxYear);
  const kmLabel = formatHomeFilterRangeChip(filters.minKm, filters.maxKm, "km");

  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {filters.categoryId ? (
        <Chip
          label={catName}
          onRemove={() =>
            onChange({
              ...filters,
              categoryId: undefined,
              vehicleBrandId: undefined,
              vehicleBrandIds: undefined,
              vehicleModel: undefined,
              vehicleModels: undefined,
            })
          }
        />
      ) : null}
      {brandIds.length > 0 ? (
        <Chip
          label={brandLabel}
          onRemove={() =>
            onChange({
              ...filters,
              vehicleBrandId: undefined,
              vehicleBrandIds: undefined,
              vehicleModel: undefined,
              vehicleModels: undefined,
            })
          }
        />
      ) : null}
      {models.length > 0 ? (
        <Chip
          label={models.join(", ")}
          onRemove={() =>
            onChange({
              ...filters,
              vehicleModel: undefined,
              vehicleModels: undefined,
            })
          }
        />
      ) : null}
      {priceLabel ? (
        <Chip
          label={priceLabel}
          onRemove={() =>
            onChange({ ...filters, minPrice: undefined, maxPrice: undefined })
          }
        />
      ) : null}
      {yearLabel ? (
        <Chip
          label={yearLabel}
          onRemove={() =>
            onChange({ ...filters, minYear: undefined, maxYear: undefined })
          }
        />
      ) : null}
      {kmLabel ? (
        <Chip
          label={kmLabel}
          onRemove={() =>
            onChange({ ...filters, minKm: undefined, maxKm: undefined })
          }
        />
      ) : null}
      {filters.fuelType ? (
        <Chip
          label={filters.fuelType}
          onRemove={() => onChange({ ...filters, fuelType: undefined })}
        />
      ) : null}
      {filters.transmissionType ? (
        <Chip
          label={filters.transmissionType}
          onRemove={() =>
            onChange({ ...filters, transmissionType: undefined })
          }
        />
      ) : null}
      {filters.hasPhoto ? (
        <Chip
          label="Fotoğraflı"
          onRemove={() => onChange({ ...filters, hasPhoto: undefined })}
        />
      ) : null}
      {filters.vehiclesOnly ? (
        <Chip
          label="Sadece araç"
          onRemove={() => onChange({ ...filters, vehiclesOnly: undefined })}
        />
      ) : null}
    </div>
  );
}
