import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabasePublicEnv } from "@/lib/env";
import { getSessionAndFavoriteSet } from "@/lib/favorites";
import type { HomeListingCardItem } from "@/lib/home-listings-feed-types";
import { listingIsGaleriDealer } from "@/lib/dealer-listing-tables";
import { listingIsAcilActive } from "@/lib/listing-acil";
import { listingIsSifirActive } from "@/lib/listing-sifir";
import { enrichListingRowsCoverImages } from "@/lib/listing-images";
import {
  EMPTY_PRICE_RATING_SUMMARY,
  fetchPriceRatingSummariesMap,
} from "@/lib/listing-price-ratings";
import { fetchListingPublicStatsMap } from "@/lib/listing-stats";
import {
  buildCategoryMap,
  buildCityMap,
  buildBrandMap,
  fetchAcilLiveListings,
  fetchCategories,
  fetchCities,
  fetchSifirLiveListings,
  fetchVehicleBrands,
  resolveListingCityDisplay,
  type ListingRow,
} from "@/lib/listings-data";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { publicAvatarUrl } from "@/lib/storage";

export type SpecialListingKind = "acil" | "sifir";

const SPECIAL_PAGE_SIZE = 48;

async function fetchOwnerMiniMap(
  supabase: SupabaseClient,
  env: SupabasePublicEnv,
  userIds: (string | undefined | null)[]
): Promise<
  Map<string, { name: string; avatarSrc: string | null; href: string }>
> {
  const ids = [...new Set(userIds.filter(Boolean).map((x) => String(x)))];
  const map = new Map<
    string,
    { name: string; avatarSrc: string | null; href: string }
  >();
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
  owners: Map<string, { name: string; avatarSrc: string | null; href: string }>
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
      href: dealerId
        ? `/bayi/galeri/${dealerId}`
        : prev?.href ?? `/kullanici/${uid}`,
    });
  }
}

function filterRows(kind: SpecialListingKind, rows: ListingRow[]): ListingRow[] {
  const now = new Date();
  if (kind === "acil") {
    return rows
      .filter((row) => listingIsAcilActive(row, now))
      .slice(0, SPECIAL_PAGE_SIZE);
  }
  return rows
    .filter((row) => listingIsSifirActive(row, now))
    .slice(0, SPECIAL_PAGE_SIZE);
}

export async function fetchSpecialListingsFeed(
  supabase: SupabaseClient,
  env: SupabasePublicEnv,
  kind: SpecialListingKind
): Promise<{ items: HomeListingCardItem[]; loggedIn: boolean }> {
  const source =
    kind === "acil"
      ? await fetchAcilLiveListings(supabase, SPECIAL_PAGE_SIZE * 2)
      : await fetchSifirLiveListings(supabase, SPECIAL_PAGE_SIZE * 2);
  const rows = filterRows(kind, source);

  if (rows.length === 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { items: [], loggedIn: Boolean(user) };
  }

  await enrichListingRowsCoverImages(
    supabase,
    env,
    rows as Record<string, unknown>[]
  );

  const [categories, cities, brands] = await Promise.all([
    fetchCategories(supabase),
    fetchCities(supabase),
    fetchVehicleBrands(supabase),
  ]);
  const catMap = buildCategoryMap(categories);
  const cityMap = buildCityMap(cities);
  const brandMap = buildBrandMap(brands);
  const ids = rows.map((r) => r.id).filter(Boolean) as string[];

  const [sessionFav, statsMap, owners] = await Promise.all([
    getSessionAndFavoriteSet(supabase, ids),
    fetchListingPublicStatsMap(supabase, ids),
    fetchOwnerMiniMap(
      supabase,
      env,
      rows.map((r) => r.user_id)
    ),
  ]);
  await overlayGaleriDealerOwners(supabase, rows, owners);

  const ratingMap = await fetchPriceRatingSummariesMap(supabase, ids);

  const items: HomeListingCardItem[] = rows.map((listing) => {
    const id = String(listing.id);
    const owner = listing.user_id ? owners.get(String(listing.user_id)) : null;
    const bid = listing.vehicle_brand_id
      ? String(listing.vehicle_brand_id)
      : "";
    const brand = bid ? brandMap.get(bid) : null;
    return {
      listing,
      categoryName: listing.category_id
        ? catMap.get(String(listing.category_id))?.name ?? null
        : null,
      brandName: brand?.name?.trim() || brand?.code?.trim() || null,
      cityDisplayName: resolveListingCityDisplay(listing, cityMap),
      stats: statsMap.get(id) ?? null,
      favorited: sessionFav.favoriteIds.has(id),
      ownerName: owner?.name ?? null,
      ownerAvatarSrc: owner?.avatarSrc ?? null,
      ownerHref: owner?.href ?? null,
      priceRating: ratingMap.get(id) ?? EMPTY_PRICE_RATING_SUMMARY,
    };
  });

  return { items, loggedIn: Boolean(sessionFav.user) };
}
