-- Mesajlaşma: onaylı + yayın penceresi içi ilanlar (passive_ready dahil).

CREATE OR REPLACE FUNCTION public.listing_is_active_for_messaging(p_listing_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t text;
  v_activation text;
  v_moderation text;
  v_live_since timestamptz;
BEGIN
  IF p_listing_id IS NULL THEN
    RETURN true;
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'listings',
    'kiralik_listings',
    'galeri_listings',
    'expertiz_listings',
    'parcaci_listings'
  ] LOOP
    IF t = 'listings' THEN
      EXECUTE format(
        'SELECT activation_status, moderation_status, COALESCE(activated_at, created_at)
         FROM public.%I WHERE id = $1 LIMIT 1',
        t
      )
      INTO v_activation, v_moderation, v_live_since
      USING p_listing_id;
    ELSE
      EXECUTE format(
        'SELECT activation_status, COALESCE(activated_at, created_at)
         FROM public.%I WHERE id = $1 LIMIT 1',
        t
      )
      INTO v_activation, v_live_since
      USING p_listing_id;
      v_moderation := 'approved';
    END IF;

    IF FOUND THEN
      IF t = 'listings' THEN
        IF lower(trim(coalesce(v_moderation, 'approved'))) <> 'approved' THEN
          RETURN false;
        END IF;
        IF lower(trim(coalesce(v_activation, 'active'))) IN (
          'passive_expired',
          'passive_payment_required'
        ) THEN
          RETURN false;
        END IF;
      ELSIF coalesce(v_activation, 'active') <> 'active' THEN
        RETURN false;
      END IF;

      IF v_live_since IS NOT NULL
         AND v_live_since + interval '30 days' < now() THEN
        RETURN false;
      END IF;

      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.listing_is_active_for_messaging(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listing_is_active_for_messaging(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listing_is_active_for_messaging(uuid) TO service_role;
