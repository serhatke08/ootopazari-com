import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabasePublicEnv } from "@/lib/env";
import { getSessionAndFavoriteSet } from "@/lib/favorites";
import type { ListingPublicStats } from "@/lib/listing-stats";
import { fetchListingPublicStatsMap } from "@/lib/listing-stats";
import {
  fetchPriceRatingSummariesMap,
  EMPTY_PRICE_RATING_SUMMARY,
  type PriceRatingSummary,
} from "@/lib/listing-price-ratings";
import {
  buildCategoryMap,
  buildCityMap,
  fetchCategories,
  fetchCities,
  fetchListingsPage,
  resolveListingCityDisplay,
  type CategoryRow,
  type CityRow,
  type ListingRow,
} from "@/lib/listings-data";
import {
  fetchHierarchyRowName,
  fetchPackageIdsForEngine,
} from "@/lib/vehicle-hierarchy";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { publicAvatarUrl } from "@/lib/storage";

export const HOME_LISTINGS_PAGE_SIZE = 30;

export type HomeListingCardItem = {
  listing: ListingRow;
  categoryName: string | null;
  cityDisplayName: string | null;
  stats: ListingPublicStats | null;
  favorited: boolean;
  ownerName: string | null;
  ownerAvatarSrc: string | null;
  ownerHref: string | null;
  priceRating: PriceRatingSummary;
};

export type HomeListingsFeedFilters = {
  categoryId?: string;
  cityId?: string;
  vehicleBrandId?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  q?: string;
  vehicleModel?: string;
  bodyType?: string;
  vehicleEnginePackageId?: string;
  vehicleEnginePackageIds?: string[];
  /** Sayfalama isteğinde URL’yi yeniden kurmak için */
  vehicleBrandModelId?: string;
  bodyStyleId?: string;
  engineId?: string;
};

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
    filters.maxYear != null
  );
}

type OwnerMini = {
  name: string;
  avatarSrc: string | null;
  href: string;
};

async function fetchOwnerMiniMap(
  supabase: SupabaseClient,
  env: SupabasePublicEnv,
  userIds: (string | undefined | null)[]
): Promise<Map<string, OwnerMini>> {
  const ids = [...new Set(userIds.filter(Boolean).map((x) => String(x)))];
  const map = new Map<string, OwnerMini>();
  if (ids.length === 0) return map;

  const { data } = await supabase
    .from("profiles")
    .select("id,full_name,username,avatar_url")
    .in("id", ids);

  for (const row of data ?? []) {
    const id = String((row as { id?: string }).id ?? "");
    if (!id) continue;
    const full = String((row as { full_name?: string }).full_name ?? "").trim();
    const un = String((row as { username?: string }).username ?? "").trim();
    const name = full || un || "Kullanıcı";
    const raw =
      sanitizeUserAvatarUrl(
        String((row as { avatar_url?: string }).avatar_url ?? "").trim()
      ) ?? "";
    const avatarSrc = raw
      ? /^https?:\/\//i.test(raw)
        ? raw
        : publicAvatarUrl(env, raw.replace(/^\/+/, ""))
      : null;
    map.set(id, { name, avatarSrc, href: `/kullanici/${id}` });
  }
  return map;
}

function buildCardItems(
  rows: ListingRow[],
  catMap: Map<string, CategoryRow>,
  cityMap: Map<string, CityRow>,
  statsMap: Map<string, ListingPublicStats>,
  favoriteIds: Set<string>,
  owners: Map<string, OwnerMini>,
  priceRatings: Map<string, PriceRatingSummary>
): HomeListingCardItem[] {
  return rows.map((listing) => {
    const cid = listing.category_id ?? undefined;
    const categoryName = cid ? (catMap.get(cid)?.name ?? null) : null;
    const sid = listing.id ? statsMap.get(listing.id) : undefined;
    const ownerId = listing.user_id ? String(listing.user_id) : null;
    const owner = ownerId ? owners.get(ownerId) : undefined;
    const emptyRating = EMPTY_PRICE_RATING_SUMMARY;
    return {
      listing,
      categoryName,
      cityDisplayName: resolveListingCityDisplay(listing, cityMap),
      stats: sid ?? null,
      favorited: listing.id ? favoriteIds.has(listing.id) : false,
      ownerName: owner?.name ?? null,
      ownerAvatarSrc: owner?.avatarSrc ?? null,
      ownerHref: owner?.href ?? null,
      priceRating: listing.id
        ? (priceRatings.get(listing.id) ?? emptyRating)
        : emptyRating,
    };
  });
}

export async function fetchHomeListingsFeed(
  supabase: SupabaseClient,
  env: SupabasePublicEnv,
  page: number,
  pageSize: number,
  filters: HomeListingsFeedFilters = {}
): Promise<{
  items: HomeListingCardItem[];
  total: number;
  loggedIn: boolean;
}> {
  const [categories, cities, { rows, total }] = await Promise.all([
    fetchCategories(supabase),
    fetchCities(supabase),
    fetchListingsPage(supabase, {
      page,
      pageSize,
      categoryId: filters.categoryId,
      cityId: filters.cityId,
      vehicleBrandId: filters.vehicleBrandId,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minYear: filters.minYear,
      maxYear: filters.maxYear,
      q: filters.q,
      vehicleModel: filters.vehicleModel,
      bodyType: filters.bodyType,
      vehicleEnginePackageId: filters.vehicleEnginePackageId,
      vehicleEnginePackageIds: filters.vehicleEnginePackageIds,
    }),
  ]);

  const catMap = buildCategoryMap(categories);
  const cityMap = buildCityMap(cities);
  const ids = rows.map((r) => r.id).filter(Boolean) as string[];

  const [statsMap, sessionFav, owners] = await Promise.all([
    fetchListingPublicStatsMap(supabase, ids),
    getSessionAndFavoriteSet(supabase, ids),
    fetchOwnerMiniMap(
      supabase,
      env,
      rows.map((r) => r.user_id ?? null)
    ),
  ]);

  const priceRatings = await fetchPriceRatingSummariesMap(
    supabase,
    ids,
    sessionFav.user?.id ?? null
  );

  return {
    items: buildCardItems(
      rows,
      catMap,
      cityMap,
      statsMap,
      sessionFav.favoriteIds,
      owners,
      priceRatings
    ),
    total,
    loggedIn: !!sessionFav.user,
  };
}
