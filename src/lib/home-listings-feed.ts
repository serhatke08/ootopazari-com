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
  buildBrandMap,
  fetchCategories,
  fetchCities,
  fetchGaleriMarketListings,
  fetchListingsPage,
  fetchVehicleBrands,
  resolveListingCityDisplay,
  type CategoryRow,
  type CityRow,
  type ListingRow,
  type VehicleBrandRow,
} from "@/lib/listings-data";
import { homeListingsFeedHasFilters } from "@/lib/home-listings-feed-filters";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { publicAvatarUrl } from "@/lib/storage";
import type {
  HomeListingCardItem,
  HomeListingsFeedFilters,
} from "@/lib/home-listings-feed-types";
import { listingIsGaleriDealer } from "@/lib/dealer-listing-tables";
import { enrichListingRowsCoverImages } from "@/lib/listing-images";

export type { HomeListingCardItem, HomeListingsFeedFilters } from "@/lib/home-listings-feed-types";
export { HOME_LISTINGS_PAGE_SIZE } from "@/lib/home-listings-feed-types";

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

async function overlayGaleriDealerOwners(
  supabase: SupabaseClient,
  rows: ListingRow[],
  owners: Map<string, OwnerMini>
): Promise<void> {
  const galeriUserIds = [
    ...new Set(
      rows
        .filter((row) => listingIsGaleriDealer(row as Record<string, unknown>))
        .map((row) => (row.user_id ? String(row.user_id) : ""))
        .filter(Boolean)
    ),
  ];
  if (galeriUserIds.length === 0) return;
  const { data } = await supabase
    .from("galeri_dealers")
    .select("id, user_id, dealer_name")
    .in("user_id", galeriUserIds)
    .eq("is_active", true);
  for (const row of data ?? []) {
    const uid = String((row as { user_id?: string }).user_id ?? "");
    const dealerId = String((row as { id?: string }).id ?? "").trim();
    const dealerName = String(
      (row as { dealer_name?: string }).dealer_name ?? ""
    ).trim();
    if (!uid || !dealerName) continue;
    const prev = owners.get(uid);
    owners.set(uid, {
      name: dealerName,
      avatarSrc: prev?.avatarSrc ?? null,
      href: dealerId ? `/bayi/galeri/${dealerId}` : prev?.href ?? `/kullanici/${uid}`,
    });
  }
}

function buildCardItems(
  rows: ListingRow[],
  catMap: Map<string, CategoryRow>,
  brandMap: Map<string, VehicleBrandRow>,
  cityMap: Map<string, CityRow>,
  statsMap: Map<string, ListingPublicStats>,
  favoriteIds: Set<string>,
  owners: Map<string, OwnerMini>,
  priceRatings: Map<string, PriceRatingSummary>
): HomeListingCardItem[] {
  return rows.map((listing) => {
    const cid = listing.category_id ?? undefined;
    const categoryName = cid ? (catMap.get(cid)?.name ?? null) : null;
    const bid = listing.vehicle_brand_id
      ? String(listing.vehicle_brand_id)
      : "";
    const brandName = bid
      ? brandMap.get(bid)?.name?.trim() || brandMap.get(bid)?.code?.trim() || null
      : null;
    const sid = listing.id ? statsMap.get(listing.id) : undefined;
    const ownerId = listing.user_id ? String(listing.user_id) : null;
    const owner = ownerId ? owners.get(ownerId) : undefined;
    const emptyRating = EMPTY_PRICE_RATING_SUMMARY;
    return {
      listing,
      categoryName,
      brandName,
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
  filters: HomeListingsFeedFilters = {},
  options?: { lite?: boolean }
): Promise<{
  items: HomeListingCardItem[];
  total: number;
  loggedIn: boolean;
}> {
  const lite = options?.lite ?? false;
  // İlan süresi / pasif: yalnızca /api/cron/expire-listings (Vercel cron) — sayfa yükünde değil.

  const excludeActiveAcil = !homeListingsFeedHasFilters(filters);

  const [categories, cities, brands, { rows, total }] = await Promise.all([
    fetchCategories(supabase),
    fetchCities(supabase),
    fetchVehicleBrands(supabase),
    fetchListingsPage(supabase, {
      page,
      pageSize,
      categoryId: filters.categoryId,
      cityId: filters.cityId,
      cityIds: filters.cityIds,
      sort: filters.sort,
      vehicleBrandId: filters.vehicleBrandId,
      vehicleBrandIds: filters.vehicleBrandIds,
      vehicleModel: filters.vehicleModel,
      vehicleModels: filters.vehicleModels,
      fuelType: filters.fuelType,
      transmissionType: filters.transmissionType,
      hasPhoto: filters.hasPhoto,
      vehiclesOnly: filters.vehiclesOnly,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minYear: filters.minYear,
      maxYear: filters.maxYear,
      minKm: filters.minKm,
      maxKm: filters.maxKm,
      q: filters.q,
      bodyType: filters.bodyType,
      vehicleEnginePackageId: filters.vehicleEnginePackageId,
      vehicleEnginePackageIds: filters.vehicleEnginePackageIds,
      vehicleEngineOther: filters.vehicleEngineOther,
      vehicleEngineOtherExcludedPackageIds:
        filters.vehicleEngineOtherExcludedPackageIds,
      vehicleEngineOtherExcludedModelTerms:
        filters.vehicleEngineOtherExcludedModelTerms,
      excludeActiveAcil,
    }),
  ]);

  await enrichListingRowsCoverImages(
    supabase,
    env,
    rows as Record<string, unknown>[]
  );

  const catMap = buildCategoryMap(categories);
  const brandMap = buildBrandMap(brands);
  const cityMap = buildCityMap(cities);
  const ids = rows.map((r) => r.id).filter(Boolean) as string[];

  if (lite) {
    const [sessionFav, priceRatings, owners] = await Promise.all([
      getSessionAndFavoriteSet(supabase, ids),
      fetchPriceRatingSummariesMap(supabase, ids),
      fetchOwnerMiniMap(
        supabase,
        env,
        rows.map((r) => r.user_id ?? null)
      ),
    ]);
    await overlayGaleriDealerOwners(supabase, rows, owners);
    const emptyStats = new Map<string, ListingPublicStats>();
    return {
      items: buildCardItems(
        rows,
        catMap,
        brandMap,
        cityMap,
        emptyStats,
        sessionFav.favoriteIds,
        owners,
        priceRatings
      ),
      total,
      loggedIn: !!sessionFav.user,
    };
  }

  const [statsMap, sessionFav, owners] = await Promise.all([
    fetchListingPublicStatsMap(supabase, ids),
    getSessionAndFavoriteSet(supabase, ids),
    fetchOwnerMiniMap(
      supabase,
      env,
      rows.map((r) => r.user_id ?? null)
    ),
  ]);
  await overlayGaleriDealerOwners(supabase, rows, owners);

  const priceRatings = await fetchPriceRatingSummariesMap(
    supabase,
    ids,
    sessionFav.user?.id ?? null
  );

  return {
    items: buildCardItems(
      rows,
      catMap,
      brandMap,
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

/** Galeri Araçlar vitrini — anasayfa kartıyla aynı, yalnızca galeri ilanları. */
export async function fetchGaleriMarketFeed(
  supabase: SupabaseClient,
  env: SupabasePublicEnv,
  filters: HomeListingsFeedFilters = {},
  dealerUserIds: string[] = []
): Promise<{
  items: HomeListingCardItem[];
  total: number;
  loggedIn: boolean;
}> {
  const [categories, cities, brands, { rows, total }] = await Promise.all([
    fetchCategories(supabase),
    fetchCities(supabase),
    fetchVehicleBrands(supabase),
    fetchGaleriMarketListings(supabase, {
      page: 1,
      pageSize: 48,
      dealerUserIds,
      categoryId: filters.categoryId,
      cityId: filters.cityId,
      cityIds: filters.cityIds,
      sort: filters.sort,
      vehicleBrandId: filters.vehicleBrandId,
      vehicleBrandIds: filters.vehicleBrandIds,
      vehicleModel: filters.vehicleModel,
      vehicleModels: filters.vehicleModels,
      fuelType: filters.fuelType,
      transmissionType: filters.transmissionType,
      hasPhoto: filters.hasPhoto,
      vehiclesOnly: filters.vehiclesOnly,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minYear: filters.minYear,
      maxYear: filters.maxYear,
      minKm: filters.minKm,
      maxKm: filters.maxKm,
      q: filters.q,
      bodyType: filters.bodyType,
      vehicleEnginePackageId: filters.vehicleEnginePackageId,
      vehicleEnginePackageIds: filters.vehicleEnginePackageIds,
      vehicleEngineOther: filters.vehicleEngineOther,
      vehicleEngineOtherExcludedPackageIds:
        filters.vehicleEngineOtherExcludedPackageIds,
      vehicleEngineOtherExcludedModelTerms:
        filters.vehicleEngineOtherExcludedModelTerms,
    }),
  ]);

  await enrichListingRowsCoverImages(
    supabase,
    env,
    rows as Record<string, unknown>[]
  );

  const ids = rows.map((r) => r.id).filter(Boolean) as string[];
  const [sessionFav, priceRatings, owners] = await Promise.all([
    getSessionAndFavoriteSet(supabase, ids),
    fetchPriceRatingSummariesMap(supabase, ids),
    fetchOwnerMiniMap(
      supabase,
      env,
      rows.map((r) => r.user_id ?? null)
    ),
  ]);
  await overlayGaleriDealerOwners(supabase, rows, owners);

  return {
    items: buildCardItems(
      rows,
      buildCategoryMap(categories),
      buildBrandMap(brands),
      buildCityMap(cities),
      new Map<string, ListingPublicStats>(),
      sessionFav.favoriteIds,
      owners,
      priceRatings
    ),
    total,
    loggedIn: !!sessionFav.user,
  };
}
