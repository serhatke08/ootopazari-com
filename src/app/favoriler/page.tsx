import Link from "next/link";
import { redirect } from "next/navigation";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MissingEnv } from "@/components/MissingEnv";
import {
  buildCategoryMap,
  fetchCategories,
  fetchListingsByIds,
} from "@/lib/listings-data";
import { fetchListingPublicStatsMap } from "@/lib/listing-stats";
import { getSessionAndFavoriteSet } from "@/lib/favorites";
import { ListingCard } from "@/components/ListingCard";

export default async function FavorilerPage() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
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

  const { data: favRows, error: favErr } = await supabase
    .from("user_favorites")
    .select("listing_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (favErr) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-sm text-red-600">
        Favoriler yüklenemedi: {favErr.message}
      </div>
    );
  }

  const orderedIds = (favRows ?? []).map(
    (r: { listing_id: string }) => r.listing_id
  );
  const listings = await fetchListingsByIds(supabase, orderedIds);
  const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
  listings.sort(
    (a, b) =>
      (orderMap.get(a.id ?? "") ?? 0) - (orderMap.get(b.id ?? "") ?? 0)
  );

  const categories = await fetchCategories(supabase);
  const catMap = buildCategoryMap(categories);
  const statIds = listings.map((l) => l.id).filter(Boolean) as string[];
  const statsMap = await fetchListingPublicStatsMap(supabase, statIds);
  const sessionFav = await getSessionAndFavoriteSet(supabase, statIds);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Favorilerim</h1>
      <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        Kayıtlı favori ilanlarınız (
        <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
          user_favorites
        </code>
        ).
      </p>

      {listings.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Henüz favori yok.{" "}
          <Link
            href="/"
            className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Ana sayfaya dönün
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-6 md:grid-cols-4 xl:grid-cols-5">
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
                stats={sid}
                loggedIn={!!sessionFav.user}
                favorited={
                  listing.id ? sessionFav.favoriteIds.has(listing.id) : false
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
