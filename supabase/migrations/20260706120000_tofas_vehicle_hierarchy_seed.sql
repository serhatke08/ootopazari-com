-- Tofaş markası: model, kasa ve motor hiyerarşisi (ilan verme dropdown'ları için)
-- Idempotent: aynı marka/model/kasa/motor tekrar eklenmez.

CREATE OR REPLACE FUNCTION public._seed_vehicle_model_engine(
  p_brand_id UUID,
  p_model_name TEXT,
  p_model_code TEXT,
  p_model_sort INTEGER,
  p_body_name TEXT,
  p_body_code TEXT,
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
    AND lower(trim(name)) = lower(trim(p_body_name))
  LIMIT 1;

  IF v_body_id IS NULL THEN
    INSERT INTO vehicle_model_body_styles (model_id, name, sort_order)
    VALUES (v_model_id, p_body_name, 0)
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
  ORDER BY sort_order NULLS LAST, created_at NULLS LAST
  LIMIT 1;

  IF v_brand_id IS NULL THEN
    RAISE NOTICE 'Tofaş markası vehicle_brands tablosunda bulunamadı; seed atlandı.';
    RETURN;
  END IF;

  -- Klasik modeller
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Murat 124', 'murat_124', 10, 'Sedan', 'sedan', '1.2', 'Benzin', 65);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Murat 124', 'murat_124', 10, 'Sedan', 'sedan', '1.3', 'Benzin', 75);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Murat 124', 'murat_124', 10, 'Sedan', 'sedan', '1.4', 'Benzin', 70);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Murat 131', 'murat_131', 20, 'Sedan', 'sedan', '1.3', 'Benzin', 75);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Murat 131', 'murat_131', 20, 'Sedan', 'sedan', '1.4', 'Benzin', 75);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Murat 131', 'murat_131', 20, 'Sedan', 'sedan', '1.6', 'Benzin', 95);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Doğan', 'dogan', 30, 'Sedan', 'sedan', '1.6', 'Benzin', 75);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Doğan SLX', 'dogan_slx', 31, 'Sedan', 'sedan', '1.6', 'Benzin', 75);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Şahin', 'sahin', 40, 'Sedan', 'sedan', '1.4', 'Benzin', 75);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Şahin', 'sahin', 40, 'Sedan', 'sedan', '1.6', 'Benzin', 75);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Şahin S', 'sahin_s', 41, 'Sedan', 'sedan', '1.6', 'Benzin', 75);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Kartal', 'kartal', 50, 'Station Wagon', 'station_wagon', '1.6', 'Benzin', 75);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Serçe', 'serce', 60, 'Hatchback', 'hatchback', '0.8', 'Benzin', 34);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Serçe', 'serce', 60, 'Hatchback', 'hatchback', '1.0', 'Benzin', 45);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Tipo', 'tipo', 70, 'Sedan', 'sedan', '1.4 ie', 'Benzin', 78);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Tipo', 'tipo', 70, 'Sedan', 'sedan', '1.6 ie', 'Benzin', 90);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Tipo', 'tipo', 70, 'Hatchback', 'hatchback', '1.4 ie', 'Benzin', 78);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Tipo', 'tipo', 70, 'Hatchback', 'hatchback', '1.6 ie', 'Benzin', 90);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Tempra', 'tempra', 80, 'Sedan', 'sedan', '1.6 ie', 'Benzin', 90);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Tempra', 'tempra', 80, 'Sedan', 'sedan', '2.0 ie', 'Benzin', 113);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Tempra', 'tempra', 80, 'Station Wagon', 'station_wagon', '1.6 ie', 'Benzin', 90);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Uno', 'uno', 90, 'Hatchback', 'hatchback', '1.0', 'Benzin', 45);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Uno', 'uno', 90, 'Hatchback', 'hatchback', '1.1', 'Benzin', 50);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Uno', 'uno', 90, 'Hatchback', 'hatchback', '1.4 ie', 'Benzin', 70);

  -- 2000'ler ve sonrası
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Palio', 'palio', 100, 'Hatchback', 'hatchback', '1.2', 'Benzin', 65);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Palio', 'palio', 100, 'Hatchback', 'hatchback', '1.4', 'Benzin', 77);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Palio', 'palio', 100, 'Hatchback', 'hatchback', '1.6', 'Benzin', 103);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Siena', 'siena', 110, 'Sedan', 'sedan', '1.2', 'Benzin', 65);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Siena', 'siena', 110, 'Sedan', 'sedan', '1.4', 'Benzin', 77);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Siena', 'siena', 110, 'Sedan', 'sedan', '1.6', 'Benzin', 103);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Albea', 'albea', 120, 'Sedan', 'sedan', '1.2', 'Benzin', 65);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Albea', 'albea', 120, 'Sedan', 'sedan', '1.4', 'Benzin', 77);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Albea', 'albea', 120, 'Sedan', 'sedan', '1.6', 'Benzin', 103);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Linea', 'linea', 130, 'Sedan', 'sedan', '1.3 Multijet', 'Dizel', 90);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Linea', 'linea', 130, 'Sedan', 'sedan', '1.4 Fire', 'Benzin', 95);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Linea', 'linea', 130, 'Sedan', 'sedan', '1.6 Multijet', 'Dizel', 105);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Egea', 'egea', 140, 'Sedan', 'sedan', '1.3 Multijet', 'Dizel', 95);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Egea', 'egea', 140, 'Sedan', 'sedan', '1.4 Fire', 'Benzin', 95);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Egea', 'egea', 140, 'Sedan', 'sedan', '1.6 Multijet', 'Dizel', 120);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Egea', 'egea', 140, 'Hatchback', 'hatchback', '1.3 Multijet', 'Dizel', 95);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Egea', 'egea', 140, 'Hatchback', 'hatchback', '1.4 Fire', 'Benzin', 95);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Egea', 'egea', 140, 'Station Wagon', 'station_wagon', '1.6 Multijet', 'Dizel', 120);

  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Felicia', 'felicia', 150, 'Sedan', 'sedan', '1.3', 'Benzin', 68);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Felicia', 'felicia', 150, 'Sedan', 'sedan', '1.6', 'Benzin', 75);
  PERFORM public._seed_vehicle_model_engine(v_brand_id, 'Felicia', 'felicia', 150, 'Station Wagon', 'station_wagon', '1.6', 'Benzin', 75);

  RAISE NOTICE 'Tofaş vehicle hierarchy seed tamamlandı (brand_id=%).', v_brand_id;
END;
$$;

DROP FUNCTION IF EXISTS public._seed_vehicle_model_engine(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER);
