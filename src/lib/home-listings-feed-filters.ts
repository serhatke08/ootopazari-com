import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  HomeListingsFeedFilters,
  HomeListingsSort,
} from "@/lib/home-listings-feed-types";
import { HOME_LISTINGS_SORT_OPTIONS } from "@/lib/home-listings-feed-types";
import {
  fetchEngineLabelsForBrandModel,
  fetchHierarchyRowName,
  fetchPackageIdsForBrandModel,
  fetchPackageIdsForEngine,
} from "@/lib/vehicle-hierarchy";

function parseFilterNum(s: string | undefined): number | undefined {
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function parseCityIdsParam(
  raw: string | null | undefined
): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
}

export function parseHomeListingsSort(
  raw: string | null | undefined
): HomeListingsSort {
  const v = (raw ?? "").trim();
  if (HOME_LISTINGS_SORT_OPTIONS.some((o) => o.value === v)) {
    return v as HomeListingsSort;
  }
  return "newest";
}

export function homeFeedFiltersToQueryString(
  filters: HomeListingsFeedFilters
): string {
  const p = new URLSearchParams();
  if (filters.categoryId) p.set("category_id", filters.categoryId);
  const cityIds =
    filters.cityIds?.length ? filters.cityIds : filters.cityId ? [filters.cityId] : [];
  if (cityIds.length > 0) p.set("city_id", cityIds.join(","));
  if (filters.sort && filters.sort !== "newest") p.set("sort", filters.sort);
  if (filters.vehicleBrandId) p.set("vehicle_brand_id", filters.vehicleBrandId);
  if (filters.minPrice != null) p.set("min_price", String(filters.minPrice));
  if (filters.maxPrice != null) p.set("max_price", String(filters.maxPrice));
  if (filters.minYear != null) p.set("min_year", String(filters.minYear));
  if (filters.maxYear != null) p.set("max_year", String(filters.maxYear));
  if (filters.minKm != null) p.set("min_km", String(filters.minKm));
  if (filters.maxKm != null) p.set("max_km", String(filters.maxKm));
  if (filters.q) p.set("q", filters.q);
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

/** URL arama parametrelerinden ana sayfa ilan filtresi (kasa/motor/paket çözümlemesi). */
export async function resolveHomeListingsFeedFilters(
  supabase: SupabaseClient,
  get: (key: string) => string | undefined
): Promise<HomeListingsFeedFilters> {
  const categoryId = get("category_id")?.trim() || undefined;
  const cityIds = parseCityIdsParam(get("city_id"));
  const vehicleBrandId = get("vehicle_brand_id")?.trim() || undefined;
  const q = get("q")?.trim() || undefined;
  const sort = parseHomeListingsSort(get("sort"));

  let vehicleModel = get("vehicle_model")?.trim() || undefined;
  const brandModelId = get("vehicle_brand_model_id")?.trim();
  if (!vehicleModel && brandModelId) {
    vehicleModel =
      (await fetchHierarchyRowName(
        supabase,
        "vehicle_brand_models",
        brandModelId
      )) ?? undefined;
  }

  let bodyType = get("body_type")?.trim() || undefined;
  const bodyStyleId = get("body_style_id")?.trim();
  if (!bodyType && bodyStyleId) {
    bodyType =
      (await fetchHierarchyRowName(
        supabase,
        "vehicle_model_body_styles",
        bodyStyleId
      )) ?? undefined;
  }

  const vehicleEnginePackageId =
    get("vehicle_engine_package_id")?.trim() || undefined;
  const engineId = get("engine_id")?.trim();
  const vehicleEngineOther = get("engine_other") === "1";
  let vehicleEnginePackageIds: string[] | undefined;
  let vehicleEngineOtherExcludedPackageIds: string[] | undefined;
  let vehicleEngineOtherExcludedModelTerms: string[] | undefined;
  if (!vehicleEnginePackageId && !vehicleEngineOther && engineId) {
    const ids = await fetchPackageIdsForEngine(supabase, engineId);
    if (ids.length > 0) vehicleEnginePackageIds = ids;
  }
  if (vehicleEngineOther && brandModelId) {
    const ids = await fetchPackageIdsForBrandModel(supabase, brandModelId);
    if (ids.length > 0) vehicleEngineOtherExcludedPackageIds = ids;
    const terms = await fetchEngineLabelsForBrandModel(supabase, brandModelId);
    if (terms.length > 0) vehicleEngineOtherExcludedModelTerms = terms;
  }

  return {
    categoryId,
    cityId: cityIds[0],
    cityIds: cityIds.length > 0 ? cityIds : undefined,
    sort: sort === "newest" ? undefined : sort,
    vehicleBrandId,
    minPrice: parseFilterNum(get("min_price")),
    maxPrice: parseFilterNum(get("max_price")),
    minYear: parseFilterNum(get("min_year")),
    maxYear: parseFilterNum(get("max_year")),
    minKm: parseFilterNum(get("min_km")),
    maxKm: parseFilterNum(get("max_km")),
    q,
    vehicleModel,
    bodyType,
    vehicleEnginePackageId,
    vehicleEnginePackageIds,
    vehicleEngineOther,
    vehicleEngineOtherExcludedPackageIds,
    vehicleEngineOtherExcludedModelTerms,
    vehicleBrandModelId: brandModelId || undefined,
    bodyStyleId: bodyStyleId || undefined,
    engineId: engineId || undefined,
  };
}

export function homeListingsFeedHasFilters(
  filters: HomeListingsFeedFilters
): boolean {
  return !!(
    filters.categoryId ||
    filters.cityId ||
    (filters.cityIds?.length ?? 0) > 0 ||
    filters.vehicleBrandId ||
    filters.q ||
    filters.vehicleModel ||
    filters.bodyType ||
    filters.vehicleEnginePackageId ||
    (filters.vehicleEnginePackageIds?.length ?? 0) > 0 ||
    filters.vehicleEngineOther ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.minYear != null ||
    filters.maxYear != null ||
    filters.minKm != null ||
    filters.maxKm != null
  );
}
