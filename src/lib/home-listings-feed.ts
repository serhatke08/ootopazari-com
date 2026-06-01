import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabasePublicEnv } from "@/lib/env";
import { getSessionAndFavoriteSet } from "@/lib/favorites";
import type { ListingPublicStats } from "@/lib/listing-stats";
import { fetchListingPublicStatsMap } from "@/lib/listing-stats";
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
};

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
  owners: Map<string, OwnerMini>
): HomeListingCardItem[] {
  return rows.map((listing) => {
    const cid = listing.category_id ?? undefined;
    const categoryName = cid ? (catMap.get(cid)?.name ?? null) : null;
    const sid = listing.id ? statsMap.get(listing.id) : undefined;
    const ownerId = listing.user_id ? String(listing.user_id) : null;
    const owner = ownerId ? owners.get(ownerId) : undefined;
    return {
      listing,
      categoryName,
      cityDisplayName: resolveListingCityDisplay(listing, cityMap),
      stats: sid ?? null,
      favorited: listing.id ? favoriteIds.has(listing.id) : false,
      ownerName: owner?.name ?? null,
      ownerAvatarSrc: owner?.avatarSrc ?? null,
      ownerHref: owner?.href ?? null,
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

  return {
    items: buildCardItems(
      rows,
      catMap,
      cityMap,
      statsMap,
      sessionFav.favoriteIds,
      owners
    ),
    total,
    loggedIn: !!sessionFav.user,
  };
}
