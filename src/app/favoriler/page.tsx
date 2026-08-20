import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import {
  buildCategoryMap,
  buildCityMap,
  fetchCategories,
  fetchCities,
  fetchListingsByIdsAny,
  isListingExpiredStatus,
  resolveListingCityDisplay,
} from "@/lib/listings-data";
import { fetchListingPublicStatsMap } from "@/lib/listing-stats";
import {
  fetchUserFavoriteFolders,
  getSessionAndFavoriteSet,
} from "@/lib/favorites";
import { ListingCard } from "@/components/ListingCard";
import { enrichListingRowsCoverImages } from "@/lib/listing-images";
import {
  EMPTY_PRICE_RATING_SUMMARY,
  fetchPriceRatingSummariesMap,
} from "@/lib/listing-price-ratings";

export const metadata: Metadata = {
  title: "Favorilerim",
  robots: { index: false, follow: false },
};

export default async function FavorilerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-12 sm:px-6">
        <MissingEnv />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/giris?next=${encodeURIComponent("/favoriler")}`);
  }

  const sp = await searchParams;
  const folderRaw = sp.folder;
  const folderParam = Array.isArray(folderRaw) ? folderRaw[0] : folderRaw;

  const { data: favRows, error: favErr } = await supabase
    .from("user_favorites")
    .select("listing_id, created_at, folder_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (favErr) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-sm text-red-600">
        Favoriler yüklenemedi: {favErr.message}
      </div>
    );
  }

  const folders = await fetchUserFavoriteFolders(supabase, user.id);
  const folderIds = new Set(folders.map((f) => f.id));
  const activeFolder =
    folderParam && folderIds.has(folderParam) ? folderParam : "";

  const visibleFavs = (favRows ?? []).filter((r: { folder_id?: string | null }) => {
    if (!activeFolder) return true;
    return String(r.folder_id ?? "") === activeFolder;
  });

  const orderedIds = visibleFavs.map(
    (r: { listing_id: string }) => r.listing_id
  );
  const listings = await fetchListingsByIdsAny(supabase, orderedIds);
  const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
  listings.sort(
    (a, b) =>
      (orderMap.get(a.id ?? "") ?? 0) - (orderMap.get(b.id ?? "") ?? 0)
  );

  await enrichListingRowsCoverImages(
    supabase,
    env,
    listings as unknown as Record<string, unknown>[]
  );

  const [categories, cities] = await Promise.all([
    fetchCategories(supabase),
    fetchCities(supabase),
  ]);
  const catMap = buildCategoryMap(categories);
  const cityMap = buildCityMap(cities);
  const statIds = listings.map((l) => l.id).filter(Boolean) as string[];
  const [statsMap, sessionFav, priceRatings] = await Promise.all([
    fetchListingPublicStatsMap(supabase, statIds),
    getSessionAndFavoriteSet(supabase, statIds),
    fetchPriceRatingSummariesMap(supabase, statIds, user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-lg font-bold text-zinc-900 sm:text-xl">
        Favorilerim
      </h1>

      {folders.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <FolderChip href="/favoriler" active={!activeFolder} label="Tümü" />
          {folders.map((f) => (
            <FolderChip
              key={f.id}
              href={`/favoriler?folder=${encodeURIComponent(f.id)}`}
              active={activeFolder === f.id}
              label={f.name}
            />
          ))}
        </div>
      ) : null}

      {listings.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {activeFolder
            ? "Bu klasörde favori yok."
            : "Henüz favori yok. "}
          {!activeFolder ? (
            <Link
              href="/"
              className="font-medium text-emerald-700 hover:underline"
            >
              Ana sayfaya dönün
            </Link>
          ) : null}
        </p>
      ) : (
        <div className="home-listings-grid">
          {listings.map((listing) => {
            const cid = listing.category_id ?? undefined;
            const categoryName = cid ? catMap.get(cid)?.name : null;
            const sid = listing.id ? statsMap.get(listing.id) : undefined;
            return (
              <ListingCard
                key={listing.id ?? String(listing.listing_number)}
                listing={listing}
                env={env}
                categoryName={categoryName}
                hideCategoryAndYear
                cityOnStatsRow
                cityDisplayName={resolveListingCityDisplay(listing, cityMap)}
                stats={sid ?? null}
                loggedIn
                favorited={
                  listing.id ? sessionFav.favoriteIds.has(listing.id) : false
                }
                expired={isListingExpiredStatus(listing)}
                priceRating={
                  listing.id
                    ? (priceRatings.get(listing.id) ?? EMPTY_PRICE_RATING_SUMMARY)
                    : EMPTY_PRICE_RATING_SUMMARY
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function FolderChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
      }`}
    >
      {label}
    </Link>
  );
}
