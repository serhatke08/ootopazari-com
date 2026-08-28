import Link from "next/link";
import { tryGetSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeleteListingButton } from "@/components/DeleteListingButton";
import { ListingCard } from "@/components/ListingCard";
import { ListingFeatureBoostPanel } from "@/components/ListingFeatureBoostPanel";
import {
  buildCategoryMap,
  fetchCategories,
  fetchListingsForUser,
  isListingExpiredStatus,
  isListingSuspended,
} from "@/lib/listings-data";
import { fetchListingQuota } from "@/lib/listing-quota";
import { listingQualityResubmitPending } from "@/lib/listing-quality";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ListingQualityOwnerScorePanel } from "@/components/listing/ListingQualityOwnerScorePanel";
import { ReactivateListingButton } from "@/components/ReactivateListingButton";
import { fetchListingPublicStatsMap } from "@/lib/listing-stats";
import { fetchBoostPaymentInfoByListing } from "@/lib/feature-boost-payment-status";
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

  const quotaClient = createSupabaseServiceClient() ?? supabase;
  const [rows, categories, quota] = await Promise.all([
    fetchListingsForUser(supabase, user.id),
    fetchCategories(supabase),
    fetchListingQuota(quotaClient, user.id),
  ]);

  const catMap = buildCategoryMap(categories);
  const ids = rows.map((r) => r.id).filter(Boolean) as string[];
  const [statsMap, sessionFav, boostPayments] = await Promise.all([
    fetchListingPublicStatsMap(supabase, ids),
    getSessionAndFavoriteSet(supabase, ids),
    fetchBoostPaymentInfoByListing(supabase, user.id, ids),
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
            const listingLabel = numStr
              ? `#${numStr} · ${String(listing.title ?? "İlan").slice(0, 40)}`
              : String(listing.title ?? "İlan");
            const approved =
              listing.moderation_status === "approved" &&
              !listingQualityResubmitPending(listing);
            const expired = isListingExpiredStatus(listing);
            const pendingReview = listingQualityResubmitPending(listing);
            return (
              <li key={id ?? String(listing.listing_number)}>
                <ListingFeatureBoostPanel
                  listing={listing}
                  listingLabel={listingLabel}
                  canBoost={approved && !isListingSuspended(listing) && !expired}
                  paymentInfo={id ? boostPayments.get(id) ?? null : null}
                  compact
                />
                <ListingQualityOwnerScorePanel
                  listing={listing}
                  editHref={numStr ? `/ilan-duzenle/${numStr}` : null}
                  variant="inline"
                />
                <ListingCard
                  listing={listing}
                  env={env}
                  categoryName={categoryName}
                  stats={id ? statsMap.get(id) ?? null : null}
                  loggedIn={loggedIn}
                  favorited={id ? favSet.has(id) : false}
                  suspended={isListingSuspended(listing) && !pendingReview}
                  expired={expired}
                  qualityReviewPending={pendingReview}
                  suspensionReason={
                    listing.suspension_reason != null
                      ? String(listing.suspension_reason)
                      : null
                  }
                  ownerActions={
                    id && numStr ? (
                      <>
                        {expired ? (
                          <ReactivateListingButton
                            listingId={id}
                            remaining={quota.remaining}
                            unlimited={quota.unlimited}
                          />
                        ) : null}
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
