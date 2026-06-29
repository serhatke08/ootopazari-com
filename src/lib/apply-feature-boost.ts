import { FEATURE_BOOST_HOURS_BETWEEN } from "@/lib/listing-feature-boost";

/** Satın alma anından itibaren her 24 saat = 1 gün pulse (3 gün = 72 saat). */
export function computeFeatureBoostListingUpdate(
  packDays: number,
  now = new Date()
): {
  featured_started_at: string;
  feature_boost_campaign_start_at: string;
  feature_boost_pack_days: number;
  featured_until: string;
} {
  const msPerDay = FEATURE_BOOST_HOURS_BETWEEN * 60 * 60 * 1000;
  const until = new Date(now.getTime() + packDays * msPerDay);

  return {
    featured_started_at: now.toISOString(),
    feature_boost_campaign_start_at: now.toISOString(),
    feature_boost_pack_days: packDays,
    featured_until: until.toISOString(),
  };
}
