import type { SupabaseClient } from "@supabase/supabase-js";
import type { HomeListingsFeedFilters } from "@/lib/home-listings-feed-types";
import {
  fetchHierarchyRowName,
  fetchPackageIdsForEngine,
} from "@/lib/vehicle-hierarchy";

function parseFilterNum(s: string | undefined): number | undefined {
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** URL arama parametrelerinden ana sayfa ilan filtresi (kasa/motor/paket çözümlemesi). */
export async function resolveHomeListingsFeedFilters(
  supabase: SupabaseClient,
  get: (key: string) => string | undefined
): Promise<HomeListingsFeedFilters> {
  const categoryId = get("category_id")?.trim() || undefined;
  const cityId = get("city_id")?.trim() || undefined;
  const vehicleBrandId = get("vehicle_brand_id")?.trim() || undefined;
  const q = get("q")?.trim() || undefined;

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
  let vehicleEnginePackageIds: string[] | undefined;
  if (!vehicleEnginePackageId && engineId) {
    const ids = await fetchPackageIdsForEngine(supabase, engineId);
    if (ids.length > 0) vehicleEnginePackageIds = ids;
  }

  return {
    categoryId,
    cityId,
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
    filters.vehicleBrandId ||
    filters.q ||
    filters.vehicleModel ||
    filters.bodyType ||
    filters.vehicleEnginePackageId ||
    (filters.vehicleEnginePackageIds?.length ?? 0) > 0 ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.minYear != null ||
    filters.maxYear != null ||
    filters.minKm != null ||
    filters.maxKm != null
  );
}
