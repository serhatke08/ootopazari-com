-- Tofaş: Şahin / Doğan / Kartal vb. motor + paket (önceden paket 0, akış Şahin’de bitiyordu).

CREATE OR REPLACE FUNCTION public._seed_tofas_engine_pkgs(
  p_model text,
  p_body text,
  p_engine text,
  p_fuel text,
  p_hp int,
  p_packages text[]
) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_brand uuid;
  v_model uuid;
  v_body uuid;
  v_eng uuid;
  pkg text;
  i int := 0;
BEGIN
  SELECT vb.id INTO v_brand
  FROM public.vehicle_brands vb
  JOIN public.categories c ON c.id = vb.category_id
  WHERE c.code = 'otomobil'
    AND (lower(vb.code) = 'tofas' OR lower(trim(vb.name)) LIKE 'tofa%')
  ORDER BY vb.sort_order NULLS LAST
  LIMIT 1;
  IF v_brand IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_model
  FROM public.vehicle_brand_models
  WHERE brand_id = v_brand
    AND lower(trim(name)) = lower(trim(p_model))
  LIMIT 1;
  IF v_model IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.vehicle_model_body_styles (model_id, name, sort_order)
  VALUES (v_model, p_body, 10)
  ON CONFLICT (model_id, name) DO UPDATE SET sort_order = public.vehicle_model_body_styles.sort_order
  RETURNING id INTO v_body;

  INSERT INTO public.vehicle_body_style_engines (
    body_style_id, name, fuel_type, horsepower, sort_order
  )
  VALUES (v_body, p_engine, p_fuel, p_hp, 10)
  ON CONFLICT (body_style_id, name) DO UPDATE SET
    fuel_type = EXCLUDED.fuel_type,
    horsepower = COALESCE(EXCLUDED.horsepower, public.vehicle_body_style_engines.horsepower)
  RETURNING id INTO v_eng;

  FOREACH pkg IN ARRAY p_packages LOOP
    i := i + 10;
    INSERT INTO public.vehicle_engine_packages (engine_id, name, sort_order)
    VALUES (v_eng, pkg, i)
    ON CONFLICT (engine_id, name) DO NOTHING;
  END LOOP;
END;
$$;

-- Şahin
SELECT public._seed_tofas_engine_pkgs('Şahin', 'Sedan', '1.4', 'Benzin', 70, ARRAY['Standart']::text[]);
SELECT public._seed_tofas_engine_pkgs('Şahin', 'Sedan', '1.6', 'Benzin', 80, ARRAY['Standart', '5 İleri']::text[]);
SELECT public._seed_tofas_engine_pkgs('Şahin', 'Sedan', '1.6 ie', 'Benzin', 83, ARRAY['Standart', '5 İleri']::text[]);

-- Şahin S
SELECT public._seed_tofas_engine_pkgs('Şahin S', 'Sedan', '1.6', 'Benzin', 80, ARRAY['S']::text[]);
SELECT public._seed_tofas_engine_pkgs('Şahin S', 'Sedan', '1.6 ie', 'Benzin', 83, ARRAY['S', '5 İleri']::text[]);

-- Doğan / Doğan SLX
SELECT public._seed_tofas_engine_pkgs('Doğan', 'Sedan', '1.6', 'Benzin', 80, ARRAY['L', 'SL']::text[]);
SELECT public._seed_tofas_engine_pkgs('Doğan SLX', 'Sedan', '1.6', 'Benzin', 83, ARRAY['SLX']::text[]);
SELECT public._seed_tofas_engine_pkgs('Doğan SLX', 'Sedan', '1.6 ie', 'Benzin', 83, ARRAY['SLX', 'SLX ie']::text[]);

-- Kartal
SELECT public._seed_tofas_engine_pkgs('Kartal', 'Station Wagon', '1.6', 'Benzin', 80, ARRAY['Standart', 'S']::text[]);
SELECT public._seed_tofas_engine_pkgs('Kartal', 'Station Wagon', '1.6 ie', 'Benzin', 83, ARRAY['Standart', 'S']::text[]);

-- Murat
SELECT public._seed_tofas_engine_pkgs('Murat 124', 'Sedan', '1.2', 'Benzin', 65, ARRAY['Standart']::text[]);
SELECT public._seed_tofas_engine_pkgs('Murat 124', 'Sedan', '1.3', 'Benzin', 70, ARRAY['Standart']::text[]);
SELECT public._seed_tofas_engine_pkgs('Murat 124', 'Sedan', '1.4', 'Benzin', 75, ARRAY['Standart']::text[]);
SELECT public._seed_tofas_engine_pkgs('Murat 131', 'Sedan', '1.3', 'Benzin', 70, ARRAY['Standart']::text[]);
SELECT public._seed_tofas_engine_pkgs('Murat 131', 'Sedan', '1.4', 'Benzin', 75, ARRAY['Standart']::text[]);
SELECT public._seed_tofas_engine_pkgs('Murat 131', 'Sedan', '1.6', 'Benzin', 95, ARRAY['Standart']::text[]);

-- Serçe
SELECT public._seed_tofas_engine_pkgs('Serçe', 'Hatchback', '0.8', 'Benzin', 34, ARRAY['Standart']::text[]);
SELECT public._seed_tofas_engine_pkgs('Serçe', 'Hatchback', '1.0', 'Benzin', 45, ARRAY['Standart']::text[]);

DROP FUNCTION IF EXISTS public._seed_tofas_engine_pkgs(text, text, text, text, int, text[]);
