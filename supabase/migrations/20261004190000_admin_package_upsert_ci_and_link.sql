-- Paket upsert: EXECUTE grant yenile + büyük/küçük harf duyarsız mevcut paket
-- bul/oluştur. Ayrıca ilanları pakete bağlayan admin RPC.

CREATE OR REPLACE FUNCTION public.admin_upsert_vehicle_package(
  p_id uuid,
  p_engine_id uuid,
  p_name text,
  p_sort_order int DEFAULT NULL,
  p_engine_capacity_cc int DEFAULT NULL,
  p_horsepower int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := trim(p_name);
  v_sort int;
  v_id uuid;
  v_reused boolean := false;
BEGIN
  PERFORM public._admin_vehicle_hierarchy_assert();
  IF v_name IS NULL OR v_name = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'name_required');
  END IF;
  IF p_engine_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'engine_required');
  END IF;
  IF p_engine_capacity_cc IS NOT NULL AND p_engine_capacity_cc <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_engine_capacity_cc');
  END IF;
  IF p_horsepower IS NOT NULL AND p_horsepower <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_horsepower');
  END IF;

  IF p_id IS NULL THEN
    -- Aynı motor altında isim (case-insensitive) varsa yeniden kullan.
    SELECT id INTO v_id
    FROM public.vehicle_engine_packages
    WHERE engine_id = p_engine_id
      AND lower(trim(name)) = lower(v_name)
    ORDER BY sort_order ASC NULLS LAST, id ASC
    LIMIT 1;

    IF v_id IS NOT NULL THEN
      v_reused := true;
      UPDATE public.vehicle_engine_packages
      SET engine_capacity_cc = coalesce(p_engine_capacity_cc, engine_capacity_cc),
          horsepower = coalesce(p_horsepower, horsepower),
          sort_order = coalesce(p_sort_order, sort_order)
      WHERE id = v_id;
    ELSE
      SELECT coalesce(max(sort_order), 0) + 1 INTO v_sort
      FROM public.vehicle_engine_packages WHERE engine_id = p_engine_id;
      IF p_sort_order IS NOT NULL THEN v_sort := p_sort_order; END IF;
      INSERT INTO public.vehicle_engine_packages (
        engine_id, name, sort_order, engine_capacity_cc, horsepower
      )
      VALUES (
        p_engine_id, v_name, v_sort, p_engine_capacity_cc, p_horsepower
      )
      RETURNING id INTO v_id;
    END IF;
  ELSE
    UPDATE public.vehicle_engine_packages
    SET name = v_name,
        sort_order = coalesce(p_sort_order, sort_order),
        engine_capacity_cc = coalesce(p_engine_capacity_cc, engine_capacity_cc),
        horsepower = coalesce(p_horsepower, horsepower)
    WHERE id = p_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'not_found');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'reused', v_reused
  );
EXCEPTION
  WHEN unique_violation THEN
    -- Yarış: aynı anda insert; mevcut satırı bul.
    SELECT id INTO v_id
    FROM public.vehicle_engine_packages
    WHERE engine_id = p_engine_id
      AND lower(trim(name)) = lower(v_name)
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'id', v_id, 'reused', true);
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'duplicate_name');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- Diğer kovadaki / paketsiz eşleşen ilanları pakete bağla (admin).
CREATE OR REPLACE FUNCTION public.admin_link_listings_to_package(
  p_package_id uuid,
  p_listing_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_engine_id uuid;
BEGIN
  PERFORM public._admin_vehicle_hierarchy_assert();
  IF p_package_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'package_required');
  END IF;
  IF p_listing_ids IS NULL OR cardinality(p_listing_ids) = 0 THEN
    RETURN jsonb_build_object('ok', true, 'updated', 0);
  END IF;

  SELECT engine_id INTO v_engine_id
  FROM public.vehicle_engine_packages
  WHERE id = p_package_id;
  IF v_engine_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'package_not_found');
  END IF;

  UPDATE public.listings
  SET vehicle_engine_package_id = p_package_id
  WHERE id = ANY (p_listing_ids)
    AND (
      vehicle_engine_package_id IS NULL
      OR vehicle_engine_package_id IS DISTINCT FROM p_package_id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'updated', v_count,
    'package_id', p_package_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_vehicle_package(
  uuid, uuid, text, int, int, int
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_vehicle_package(
  uuid, uuid, text, int, int, int
) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_link_listings_to_package(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_link_listings_to_package(uuid, uuid[]) TO authenticated;

-- Diğer hiyerarşi RPC'leri için EXECUTE yenile (42501 önlemi).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'admin\_%' ESCAPE '\'
      AND (
        p.proname LIKE 'admin\_upsert\_vehicle\_%' ESCAPE '\'
        OR p.proname LIKE 'admin\_delete\_vehicle\_%' ESCAPE '\'
        OR p.proname LIKE 'admin\_update\_vehicle\_%' ESCAPE '\'
        OR p.proname LIKE 'admin\_set\_vehicle\_%' ESCAPE '\'
        OR p.proname = 'admin_link_listings_to_package'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
