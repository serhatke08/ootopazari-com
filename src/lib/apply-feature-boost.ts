export function computeFeatureBoostListingUpdate(
  packDays: number,
  now = new Date()
): {
  featured_started_at: string;
  feature_boost_campaign_start_at: string;
  feature_boost_pack_days: number;
  featured_until: string;
} {
  const until = new Date(now);
  until.setDate(until.getDate() + packDays);

  return {
    featured_started_at: now.toISOString(),
    feature_boost_campaign_start_at: now.toISOString(),
    feature_boost_pack_days: packDays,
    featured_until: until.toISOString(),
  };
}
