import Link from "next/link";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeleteListingButton } from "@/components/DeleteListingButton";
import { ListingCard } from "@/components/ListingCard";
import {
  buildCategoryMap,
  fetchCategories,
  fetchListingsForUser,
  isListingSuspended,
} from "@/lib/listings-data";
import { fetchListingPublicStatsMap } from "@/lib/listing-stats";
import { getSessionAndFavoriteSet } from "@/lib/favorites";

export default async function ProfilIlanlarimPage() {
  const env = tryGetSupabaseEnv();
  if (!env) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [rows, categories] = await Promise.all([
    fetchListingsForUser(supabase, user.id),
    fetchCategories(supabase),
  ]);

  const catMap = buildCategoryMap(categories);
  const ids = rows.map((r) => r.id).filter(Boolean) as string[];
  const [statsMap, sessionFav] = await Promise.all([
    fetchListingPublicStatsMap(supabase, ids),
    getSessionAndFavoriteSet(supabase, ids),
  ]);
  const loggedIn = !!sessionFav.user;
  const favSet = sessionFav.favoriteIds;

  return (
    <div className="mt-8">
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Henüz ilan vermediniz.{" "}
          <Link href="/ilan-ver" className="font-medium text-zinc-900 underline">
            İlan ver
          </Link>{" "}
          sayfasından yeni ilan oluşturabilirsiniz.
        </p>
      ) : (
        <ul className="grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((listing) => {
            const id = listing.id as string | undefined;
            const categoryName =
              listing.category_id != null
                ? catMap.get(String(listing.category_id))?.name ?? null
                : null;
            const num = listing.listing_number;
            const numStr =
              num != null && String(num).trim() !== "" ? String(num) : null;
            return (
              <li key={id ?? String(listing.listing_number)}>
                <ListingCard
                  listing={listing}
                  env={env}
                  categoryName={categoryName}
                  stats={id ? statsMap.get(id) ?? null : null}
                  loggedIn={loggedIn}
                  favorited={id ? favSet.has(id) : false}
                  suspended={isListingSuspended(listing)}
                  suspensionReason={
                    listing.suspension_reason != null
                      ? String(listing.suspension_reason)
                      : null
                  }
                  ownerActions={
                    id && numStr ? (
                      <>
                        <Link
                          href={`/ilan-duzenle/${numStr}`}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                        >
                          Düzenle
                        </Link>
                        <DeleteListingButton
                          listingId={id}
                          listingLabel={`İlan #${numStr}`}
                        />
                      </>
                    ) : null
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
