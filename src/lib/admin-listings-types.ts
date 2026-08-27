export type AdminListingRow = {
  id: string;
  listing_number: number | string | null;
  title: string | null;
  cover_quality_score: number | null;
  cover_quality_source: string | null;
  feed_sort_tier: number | null;
  quality_demoted_at: string | null;
  moderation_status: string | null;
  activation_status: string | null;
  created_at: string | null;
  feed_rank: number;
  tier_label: string;
  is_demoted: boolean;
};
