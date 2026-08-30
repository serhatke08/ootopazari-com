-- Mesajlaşma: onaylı + yayın penceresi içi ilanlar (passive_ready dahil).
-- NOT: Dinamik EXECUTE + FOUND güvenilir değildi; statik sorgular kullanılıyor.

CREATE OR REPLACE FUNCTION public.listing_is_active_for_messaging(p_listing_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activation text;
  v_moderation text;
  v_live_since timestamptz;
BEGIN
  IF p_listing_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT activation_status, moderation_status, COALESCE(activated_at, created_at)
    INTO v_activation, v_moderation, v_live_since
  FROM public.listings
  WHERE id = p_listing_id
  LIMIT 1;

  IF FOUND THEN
    IF lower(trim(coalesce(v_moderation, 'approved'))) <> 'approved' THEN
      RETURN false;
    END IF;
    IF lower(trim(coalesce(v_activation, 'active'))) IN (
      'passive_expired',
      'passive_payment_required'
    ) THEN
      RETURN false;
    END IF;
    IF v_live_since IS NOT NULL
       AND v_live_since + interval '30 days' < now() THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  SELECT activation_status, COALESCE(activated_at, created_at)
    INTO v_activation, v_live_since
  FROM public.kiralik_listings
  WHERE id = p_listing_id
  LIMIT 1;

  IF FOUND THEN
    IF coalesce(v_activation, 'active') <> 'active' THEN
      RETURN false;
    END IF;
    IF v_live_since IS NOT NULL
       AND v_live_since + interval '30 days' < now() THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  SELECT activation_status, COALESCE(activated_at, created_at)
    INTO v_activation, v_live_since
  FROM public.galeri_listings
  WHERE id = p_listing_id
  LIMIT 1;

  IF FOUND THEN
    IF coalesce(v_activation, 'active') <> 'active' THEN
      RETURN false;
    END IF;
    IF v_live_since IS NOT NULL
       AND v_live_since + interval '30 days' < now() THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  SELECT activation_status, COALESCE(activated_at, created_at)
    INTO v_activation, v_live_since
  FROM public.expertiz_listings
  WHERE id = p_listing_id
  LIMIT 1;

  IF FOUND THEN
    IF coalesce(v_activation, 'active') <> 'active' THEN
      RETURN false;
    END IF;
    IF v_live_since IS NOT NULL
       AND v_live_since + interval '30 days' < now() THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  SELECT activation_status, COALESCE(activated_at, created_at)
    INTO v_activation, v_live_since
  FROM public.parcaci_listings
  WHERE id = p_listing_id
  LIMIT 1;

  IF FOUND THEN
    IF coalesce(v_activation, 'active') <> 'active' THEN
      RETURN false;
    END IF;
    IF v_live_since IS NOT NULL
       AND v_live_since + interval '30 days' < now() THEN
      RETURN false;
    END IF;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.listing_is_active_for_messaging(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listing_is_active_for_messaging(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listing_is_active_for_messaging(uuid) TO service_role;
