-- Tofaş: yalnızca yerli modeller (Fiat klonları yok). Idempotent.

CREATE OR REPLACE FUNCTION public._seed_vehicle_model_engine(
  p_brand_id UUID,
  p_model_name TEXT,
  p_model_code TEXT,
  p_model_sort INTEGER,
  p_engine_name TEXT,
  p_fuel_type TEXT DEFAULT 'Benzin',
  p_horsepower INTEGER DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_model_id UUID;
  v_body_id UUID;
BEGIN
  SELECT id INTO v_model_id
  FROM vehicle_brand_models
  WHERE brand_id = p_brand_id
    AND lower(trim(name)) = lower(trim(p_model_name))
  LIMIT 1;

  IF v_model_id IS NULL THEN
    INSERT INTO vehicle_brand_models (brand_id, name, code, sort_order)
    VALUES (p_brand_id, p_model_name, p_model_code, p_model_sort)
    RETURNING id INTO v_model_id;
  END IF;

  SELECT id INTO v_body_id
  FROM vehicle_model_body_styles
  WHERE model_id = v_model_id
  LIMIT 1;

  IF v_body_id IS NULL THEN
    INSERT INTO vehicle_model_body_styles (model_id, name, sort_order)
    VALUES (v_model_id, 'Genel', 0)
    RETURNING id INTO v_body_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM vehicle_body_style_engines
    WHERE body_style_id = v_body_id
      AND lower(trim(name)) = lower(trim(p_engine_name))
  ) THEN
    INSERT INTO vehicle_body_style_engines (
      body_style_id,
      name,
      fuel_type,
      horsepower,
      sort_order
    )
    VALUES (
      v_body_id,
      p_engine_name,
      p_fuel_type,
      p_horsepower,
      0
    );
  END IF;
END;
$$;

DO $$
DECLARE
  v_brand_id UUID;
BEGIN
  SELECT id INTO v_brand_id
  FROM vehicle_brands
  WHERE lower(coalesce(code, '')) IN ('tofas', 'tofaş')
     OR lower(trim(name)) IN ('tofas', 'tofaş')
     OR lower(trim(name)) LIKE 'tofa%'
  ORDER BY sort_order NULLS LAST, id
  LIMIT 1;

  IF v_brand_id IS NULL THEN
    RAISE NOTICE 'Tofaş markası bulunamadı; seed atlandı.';
    RETURN;
  END IF;

  -- Fiat / diğer marka klonlarını Tofaş altından temizle
  DELETE FROM vehicle_brand_models
  WHERE brand_id = v_brand_id
    AND lower(trim(name)) IN (
      'tipo', 'tempra', 'uno', 'palio', 'siena', 'albea',
      'linea', 'egea', 'felicia', 'bravo', 'punto', '500',
      'brava', 'idea', 'panda', 'stilo', 'marea', 'ducato',
      'doblo', 'fiorino', 'doblo cargo', 'fiorino combi',
      'talento', 'scudo', 'pratico', 'strada (ticari)', 'e-ducato'
    );

  -- Klasik Tofaş modelleri
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Murat 124', 'murat_124', 10, '1.2', 'Benzin', 65);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Murat 124', 'murat_124', 10, '1.3', 'Benzin', 75);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Murat 124', 'murat_124', 10, '1.4', 'Benzin', 70);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Murat 131', 'murat_131', 20, '1.3', 'Benzin', 75);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Murat 131', 'murat_131', 20, '1.4', 'Benzin', 75);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Murat 131', 'murat_131', 20, '1.6', 'Benzin', 95);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Doğan', 'dogan', 30, '1.6', 'Benzin', 75);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Doğan SLX', 'dogan_slx', 31, '1.6', 'Benzin', 75);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Şahin', 'sahin', 40, '1.4', 'Benzin', 75);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Şahin', 'sahin', 40, '1.6', 'Benzin', 75);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Şahin S', 'sahin_s', 41, '1.6', 'Benzin', 75);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Kartal', 'kartal', 50, '1.6', 'Benzin', 75);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Serçe', 'serce', 60, '0.8', 'Benzin', 34);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Serçe', 'serce', 60, '1.0', 'Benzin', 45);

  RAISE NOTICE 'Tofaş seed tamam (brand_id=%).', v_brand_id;
END;
$$;

DROP FUNCTION IF EXISTS public._seed_vehicle_model_engine(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, INTEGER);
