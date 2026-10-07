-- Katalog donanım sekmesi: kronik (serbest metin) + web URL (model / paket).

ALTER TABLE public.vehicle_brand_models
  ADD COLUMN IF NOT EXISTS catalog_note TEXT,
  ADD COLUMN IF NOT EXISTS info_url TEXT;

ALTER TABLE public.vehicle_engine_packages
  ADD COLUMN IF NOT EXISTS catalog_note TEXT,
  ADD COLUMN IF NOT EXISTS info_url TEXT;

COMMENT ON COLUMN public.vehicle_brand_models.catalog_note IS
  'İlan detay Donanım sekmesinde satırların altında gösterilecek kronik / serbest metin.';
COMMENT ON COLUMN public.vehicle_brand_models.info_url IS
  'İlan detay Donanım sekmesi altındaki web bağlantısı.';
COMMENT ON COLUMN public.vehicle_engine_packages.catalog_note IS
  'İlan detay Donanım sekmesinde satırların altında gösterilecek kronik / serbest metin.';
COMMENT ON COLUMN public.vehicle_engine_packages.info_url IS
  'İlan detay Donanım sekmesi altındaki web bağlantısı.';

CREATE OR REPLACE FUNCTION public.admin_set_vehicle_model_catalog_meta(
  p_id uuid,
  p_catalog_note text DEFAULT NULL,
  p_info_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_note text := NULLIF(trim(coalesce(p_catalog_note, '')), '');
  v_url text := NULLIF(trim(coalesce(p_info_url, '')), '');
BEGIN
  PERFORM public._admin_vehicle_hierarchy_assert();
  IF p_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'id_required');
  END IF;

  UPDATE public.vehicle_brand_models
  SET catalog_note = v_note,
      info_url = v_url
  WHERE id = p_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'catalog_note', v_note,
    'info_url', v_url
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_vehicle_package_catalog_meta(
  p_id uuid,
  p_catalog_note text DEFAULT NULL,
  p_info_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_note text := NULLIF(trim(coalesce(p_catalog_note, '')), '');
  v_url text := NULLIF(trim(coalesce(p_info_url, '')), '');
BEGIN
  PERFORM public._admin_vehicle_hierarchy_assert();
  IF p_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'id_required');
  END IF;

  UPDATE public.vehicle_engine_packages
  SET catalog_note = v_note,
      info_url = v_url
  WHERE id = p_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'catalog_note', v_note,
    'info_url', v_url
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_vehicle_model_catalog_meta(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_vehicle_model_catalog_meta(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_vehicle_package_catalog_meta(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_vehicle_package_catalog_meta(uuid, text, text) TO authenticated;
