import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabasePublicEnv } from "@/lib/env";
import { getSessionAndFavoriteSet } from "@/lib/favorites";
import type { HomeListingCardItem } from "@/lib/home-listings-feed-types";
import { listingIsAcilActive } from "@/lib/listing-acil";
import { parseListingDate } from "@/lib/listing-feature-boost";
import { enrichListingRowsCoverImages } from "@/lib/listing-images";
import {
  EMPTY_PRICE_RATING_SUMMARY,
  fetchPriceRatingSummariesMap,
} from "@/lib/listing-price-ratings";
import { fetchListingPublicStatsMap } from "@/lib/listing-stats";
import {
  buildCategoryMap,
  buildCityMap,
  fetchAcilLiveListings,
  fetchCategories,
  fetchCities,
  fetchFeaturedLiveListings,
  resolveListingCityDisplay,
  type ListingRow,
} from "@/lib/listings-data";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";
import { publicAvatarUrl } from "@/lib/storage";

export type SpecialListingKind = "acil" | "vitrin";

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

function filterRows(kind: SpecialListingKind, rows: ListingRow[]): ListingRow[] {
  const now = new Date();
  if (kind === "acil") {
    return rows
      .filter((row) => listingIsAcilActive(row, now))
      .slice(0, SPECIAL_PAGE_SIZE);
  }
  return rows
    .filter((row) => {
      const until = parseListingDate(row.featured_until);
      return until != null && until > now;
    })
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
      : await fetchFeaturedLiveListings(supabase, SPECIAL_PAGE_SIZE * 2);
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

  const [categories, cities] = await Promise.all([
    fetchCategories(supabase),
    fetchCities(supabase),
  ]);
  const catMap = buildCategoryMap(categories);
  const cityMap = buildCityMap(cities);
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

  const ratingMap = await fetchPriceRatingSummariesMap(supabase, ids);

  const items: HomeListingCardItem[] = rows.map((listing) => {
    const id = String(listing.id);
    const owner = listing.user_id ? owners.get(String(listing.user_id)) : null;
    return {
      listing,
      categoryName: listing.category_id
        ? catMap.get(String(listing.category_id))?.name ?? null
        : null,
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
