-- Bozuk featured_until (test / eski veri) düzeltmesi — Supabase SQL Editor'da çalıştırın.
-- İlan #12300085: bugün alınan tek 3 günlük paket → 2 Temmuz 2026 civarı bitiş.

SELECT set_config('app.featured_until_internal', 'on', true);

UPDATE listings l
SET
  feature_boost_campaign_start_at = sub.campaign_start,
  featured_started_at = sub.campaign_start,
  feature_boost_pack_days = sub.pack_days,
  featured_until = sub.campaign_start + make_interval(days => sub.pack_days)
FROM (
  SELECT
    l2.id,
    COALESCE(
      (
        SELECT MIN(p.applied_at)
        FROM feature_boost_iap_purchases p
        WHERE p.listing_id = l2.id
          AND p.platform = 'web'
          AND p.status = 'applied'
          AND p.applied_at >= date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul')
      ),
      now()
    ) AS campaign_start,
    3 AS pack_days
  FROM listings l2
  WHERE l2.listing_number = 12300085
) sub
WHERE l.id = sub.id;

SELECT
  listing_number,
  feature_boost_campaign_start_at,
  feature_boost_pack_days,
  featured_until
FROM listings
WHERE listing_number = 12300085;
