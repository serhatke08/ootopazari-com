-- Bitiş tarihi: kampanya başlangıcı + toplam pack_days (bozuk featured_until üstüne ekleme yok).
CREATE OR REPLACE FUNCTION register_feature_boost_paytr_purchase(
  p_user_id uuid,
  p_listing_id uuid,
  p_product_id text,
  p_transaction_id text,
  p_days int,
  p_hours_between int DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing listings%ROWTYPE;
  v_pack_days int;
  v_existing feature_boost_iap_purchases%ROWTYPE;
  v_started timestamptz := now();
  v_until timestamptz;
  v_campaign_start timestamptz;
  v_new_pack_days int;
  v_active boolean;
  v_has_pulse_campaign boolean;
  v_purchase_id uuid;
BEGIN
  IF p_transaction_id IS NULL OR btrim(p_transaction_id) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_transaction_id');
  END IF;

  v_pack_days := CASE p_product_id
    WHEN 'feature_boost_one_time' THEN 1
    WHEN 'feature_boost_3d_24h' THEN 3
    WHEN 'feature_boost_7d_24h' THEN 7
    WHEN 'feature_boost_10d_24h' THEN 10
    WHEN 'feature_boost_15d_24h' THEN 15
    WHEN 'feature_boost_30d_24h' THEN 30
    ELSE NULL
  END;

  IF v_pack_days IS NULL OR p_days IS NULL OR p_days <> v_pack_days THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_pack');
  END IF;

  IF p_hours_between IS NULL OR p_hours_between <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_hours_between');
  END IF;

  SELECT *
  INTO v_existing
  FROM feature_boost_iap_purchases
  WHERE platform = 'web'
    AND transaction_id = p_transaction_id
  LIMIT 1;

  IF FOUND THEN
    SELECT featured_until, feature_boost_pack_days
    INTO v_until, v_pack_days
    FROM listings
    WHERE id = p_listing_id;

    RETURN jsonb_build_object(
      'ok', true,
      'already_applied', true,
      'listing_id', p_listing_id,
      'purchase_id', v_existing.id,
      'listing_table', COALESCE(v_existing.listing_table, 'listings'),
      'featured_until', v_until,
      'feature_boost_pack_days', v_pack_days
    );
  END IF;

  SELECT *
  INTO v_listing
  FROM listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'listing_not_found');
  END IF;

  IF v_listing.user_id IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_listing.moderation_status IS DISTINCT FROM 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'listing_not_approved');
  END IF;

  v_active := v_listing.featured_until IS NOT NULL
    AND v_listing.featured_until > v_started;

  v_campaign_start := COALESCE(
    v_listing.feature_boost_campaign_start_at,
    v_listing.featured_started_at
  );

  v_has_pulse_campaign := v_active
    AND v_campaign_start IS NOT NULL
    AND COALESCE(v_listing.feature_boost_pack_days, 0) > 0;

  IF v_has_pulse_campaign THEN
    v_new_pack_days := COALESCE(v_listing.feature_boost_pack_days, 0) + p_days;
    v_until := v_campaign_start + make_interval(days => v_new_pack_days);
  ELSE
    v_campaign_start := v_started;
    v_new_pack_days := p_days;
    v_until := v_started + make_interval(days => p_days);
  END IF;

  PERFORM set_config('app.featured_until_internal', 'on', true);

  UPDATE listings
  SET
    featured_started_at = CASE
      WHEN v_has_pulse_campaign THEN COALESCE(v_listing.featured_started_at, v_campaign_start)
      ELSE v_started
    END,
    feature_boost_campaign_start_at = v_campaign_start,
    feature_boost_pack_days = v_new_pack_days,
    featured_until = v_until
  WHERE id = p_listing_id;

  INSERT INTO feature_boost_iap_purchases (
    user_id,
    listing_id,
    platform,
    product_id,
    transaction_id,
    days,
    hours_between,
    status,
    verified_at,
    applied_at,
    listing_table
  )
  VALUES (
    p_user_id,
    p_listing_id,
    'web',
    p_product_id,
    p_transaction_id,
    p_days,
    p_hours_between,
    'applied',
    v_started,
    v_started,
    'listings'
  )
  RETURNING id INTO v_purchase_id;

  RETURN jsonb_build_object(
    'ok', true,
    'days', p_days,
    'listing_id', p_listing_id,
    'purchase_id', v_purchase_id,
    'hours_between', p_hours_between,
    'listing_table', 'listings',
    'featured_until', v_until,
    'featured_started_at', CASE
      WHEN v_has_pulse_campaign THEN COALESCE(v_listing.featured_started_at, v_campaign_start)
      ELSE v_started
    END,
    'feature_boost_campaign_start_at', v_campaign_start,
    'feature_boost_pack_days', v_new_pack_days,
    'stacked', v_has_pulse_campaign
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT id, listing_table
    INTO v_purchase_id, v_existing.listing_table
    FROM feature_boost_iap_purchases
    WHERE platform = 'web'
      AND transaction_id = p_transaction_id
    LIMIT 1;

    SELECT featured_until, feature_boost_pack_days
    INTO v_until, v_pack_days
    FROM listings
    WHERE id = p_listing_id;

    RETURN jsonb_build_object(
      'ok', true,
      'already_applied', true,
      'listing_id', p_listing_id,
      'purchase_id', v_purchase_id,
      'listing_table', COALESCE(v_existing.listing_table, 'listings'),
      'featured_until', v_until,
      'feature_boost_pack_days', v_pack_days
    );
END;
$$;

REVOKE ALL ON FUNCTION register_feature_boost_paytr_purchase(uuid, uuid, text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_feature_boost_paytr_purchase(uuid, uuid, text, text, int, int) TO service_role;
