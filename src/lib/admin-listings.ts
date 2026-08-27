import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assignFeedRanks,
  feedSortTierLabel,
  listingCoverQualitySortTier,
} from "@/lib/listing-feed-sort";

const ADMIN_LISTING_SELECT = [
  "id",
  "listing_number",
  "title",
  "cover_quality_score",
  "cover_quality_source",
  "feed_sort_tier",
  "quality_demoted_at",
  "moderation_status",
  "activation_status",
  "created_at",
].join(", ");

import type { AdminListingRow } from "@/lib/admin-listings-types";

function toAdminRow(
  row: Record<string, unknown> & { feed_rank: number }
): AdminListingRow {
  const tier =
    row.feed_sort_tier != null
      ? Number(row.feed_sort_tier)
      : listingCoverQualitySortTier(row);
  return {
    id: String(row.id ?? ""),
    listing_number:
      row.listing_number != null ? (row.listing_number as number | string) : null,
    title: row.title != null ? String(row.title) : null,
    cover_quality_score:
      row.cover_quality_score != null ? Number(row.cover_quality_score) : null,
    cover_quality_source:
      row.cover_quality_source != null
        ? String(row.cover_quality_source)
        : null,
    feed_sort_tier: Number.isFinite(tier) ? tier : null,
    quality_demoted_at:
      row.quality_demoted_at != null ? String(row.quality_demoted_at) : null,
    moderation_status:
      row.moderation_status != null ? String(row.moderation_status) : null,
    activation_status:
      row.activation_status != null ? String(row.activation_status) : null,
    created_at: row.created_at != null ? String(row.created_at) : null,
    feed_rank: row.feed_rank,
    tier_label: feedSortTierLabel(tier),
    is_demoted: row.quality_demoted_at != null && String(row.quality_demoted_at).trim() !== "",
  };
}

/** Web admin grid — service_role ile; yalnızca sunucu tarafı. */
export async function fetchAdminListingsForGrid(
  service: SupabaseClient,
  options: { table?: string; limit?: number } = {}
): Promise<AdminListingRow[]> {
  const table = options.table?.trim() || "listings";
  const limit = options.limit ?? 500;

  let query = service
    .from(table)
    .select(ADMIN_LISTING_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  let { data, error } = await query;
  if (error && /cover_quality_score|feed_sort_tier|activation_status/i.test(error.message)) {
    const fallbackSelect = [
      "id",
      "listing_number",
      "title",
      "moderation_status",
      "created_at",
    ].join(", ");
    ({ data, error } = await service
      .from(table)
      .select(fallbackSelect)
      .order("created_at", { ascending: false })
      .limit(limit));
  }

  if (error) {
    console.warn("fetchAdminListingsForGrid:", error.message);
    return [];
  }

  const ranked = assignFeedRanks(
    (data ?? []) as unknown as Record<string, unknown>[]
  );
  return ranked.map(toAdminRow);
}
