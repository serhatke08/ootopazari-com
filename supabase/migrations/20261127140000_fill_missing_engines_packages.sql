-- Eksik motor / paket: pickup, Fiat/Ford, motosiklet, hasarlı klon, iskelet kategoriler.

CREATE OR REPLACE FUNCTION public._seed_fill_model(
  p_cat text,
  p_brand text,
  p_model_name text,
  p_model_code text,
  p_sort int,
  p_body text,
  p_engine_name text,
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
  WHERE c.code = p_cat
    AND (
      lower(vb.code) = lower(p_brand)
      OR lower(trim(vb.name)) = lower(trim(p_brand))
    )
  LIMIT 1;
  IF v_brand IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.vehicle_brand_models (brand_id, name, code, sort_order)
  VALUES (v_brand, p_model_name, p_model_code, p_sort)
  ON CONFLICT (brand_id, code) DO UPDATE SET
    name = COALESCE(public.vehicle_brand_models.name, EXCLUDED.name),
    sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_model;

  IF v_model IS NULL THEN
    SELECT id INTO v_model
    FROM public.vehicle_brand_models
    WHERE brand_id = v_brand
      AND (code = p_model_code OR lower(trim(name)) = lower(trim(p_model_name)))
    LIMIT 1;
  END IF;
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
  VALUES (v_body, p_engine_name, p_fuel, p_hp, 10)
  ON CONFLICT (body_style_id, name) DO UPDATE SET
    fuel_type = COALESCE(EXCLUDED.fuel_type, public.vehicle_body_style_engines.fuel_type),
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

CREATE OR REPLACE FUNCTION public._clone_catalog_brand(p_src uuid, p_dst uuid)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  r_model record;
  r_body record;
  r_eng record;
  v_model uuid;
  v_body uuid;
  v_eng uuid;
BEGIN
  FOR r_model IN
    SELECT * FROM public.vehicle_brand_models
    WHERE brand_id = p_src
      AND lower(coalesce(code, '')) <> 'diger_modeller'
  LOOP
    INSERT INTO public.vehicle_brand_models (
      brand_id, name, code, body_type, sort_order, line_group, horsepower, engine_capacity_cc
    )
    VALUES (
      p_dst, r_model.name, r_model.code, r_model.body_type, r_model.sort_order,
      r_model.line_group, r_model.horsepower, r_model.engine_capacity_cc
    )
    ON CONFLICT (brand_id, code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_model;

    FOR r_body IN
      SELECT * FROM public.vehicle_model_body_styles WHERE model_id = r_model.id
    LOOP
      INSERT INTO public.vehicle_model_body_styles (model_id, name, sort_order)
      VALUES (v_model, r_body.name, r_body.sort_order)
      ON CONFLICT (model_id, name) DO UPDATE SET sort_order = EXCLUDED.sort_order
      RETURNING id INTO v_body;

      FOR r_eng IN
        SELECT * FROM public.vehicle_body_style_engines WHERE body_style_id = r_body.id
      LOOP
        INSERT INTO public.vehicle_body_style_engines (
          body_style_id, name, fuel_type, horsepower, sort_order
        )
        VALUES (v_body, r_eng.name, r_eng.fuel_type, r_eng.horsepower, r_eng.sort_order)
        ON CONFLICT (body_style_id, name) DO UPDATE SET
          fuel_type = COALESCE(EXCLUDED.fuel_type, public.vehicle_body_style_engines.fuel_type),
          horsepower = COALESCE(EXCLUDED.horsepower, public.vehicle_body_style_engines.horsepower)
        RETURNING id INTO v_eng;

        INSERT INTO public.vehicle_engine_packages (engine_id, name, sort_order)
        SELECT v_eng, p.name, p.sort_order
        FROM public.vehicle_engine_packages p
        WHERE p.engine_id = r_eng.id
        ON CONFLICT (engine_id, name) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

-- Pickup
SELECT public._seed_fill_model('pickup','toyota','Hilux','hilux',10,'Pickup','2.4 D-4D 150','Dizel',150,ARRAY['Comfort','Adventure','Invincible']::text[]);
SELECT public._seed_fill_model('pickup','toyota','Hilux','hilux',10,'Pickup','2.8 D-4D 204','Dizel',204,ARRAY['Adventure','Invincible','GR Sport']::text[]);
SELECT public._seed_fill_model('pickup','toyota','Tacoma','tacoma',20,'Pickup','3.5 V6','Benzin',278,ARRAY['SR5','TRD Off-Road','TRD Pro']::text[]);
SELECT public._seed_fill_model('pickup','toyota','Tundra','tundra',30,'Pickup','3.5 i-Force','Benzin',389,ARRAY['SR5','Limited','Platinum']::text[]);
SELECT public._seed_fill_model('pickup','ford','Ranger','ranger',10,'Pickup','2.0 EcoBlue 170','Dizel',170,ARRAY['XL','XLT','Wildtrak']::text[]);
SELECT public._seed_fill_model('pickup','ford','Ranger','ranger',10,'Pickup','2.0 EcoBlue 205','Dizel',205,ARRAY['XLT','Wildtrak','Raptor']::text[]);
SELECT public._seed_fill_model('pickup','ford','Ranger','ranger',10,'Pickup','3.2 TDCi','Dizel',200,ARRAY['XLT','Wildtrak']::text[]);
SELECT public._seed_fill_model('pickup','ford','F-150','f_150',20,'Pickup','3.5 EcoBoost','Benzin',400,ARRAY['XLT','Lariat','Limited']::text[]);
SELECT public._seed_fill_model('pickup','ford','F-150','f_150',20,'Pickup','5.0 V8','Benzin',400,ARRAY['XLT','Lariat']::text[]);
SELECT public._seed_fill_model('pickup','volkswagen','Amarok','amarok',10,'Pickup','2.0 TDI','Dizel',180,ARRAY['Comfortline','Highline']::text[]);
SELECT public._seed_fill_model('pickup','volkswagen','Amarok','amarok',10,'Pickup','3.0 TDI','Dizel',258,ARRAY['Highline','Aventura','PanAmericana']::text[]);
SELECT public._seed_fill_model('pickup','isuzu','D-Max','d_max',10,'Pickup','1.9 Ddi','Dizel',164,ARRAY['V-Cross','LSE']::text[]);
SELECT public._seed_fill_model('pickup','isuzu','D-Max','d_max',10,'Pickup','3.0 Ddi','Dizel',190,ARRAY['V-Cross','LSE']::text[]);
SELECT public._seed_fill_model('pickup','mitsubishi','L200 (Pick-up)','l200_pick_up',10,'Pickup','2.4 MIVEC','Dizel',181,ARRAY['Intense','Intense Plus','Barbarian']::text[]);
SELECT public._seed_fill_model('pickup','nissan','Navara (Pick-up)','navara_pick_up',10,'Pickup','2.3 dCi','Dizel',190,ARRAY['Comfort','Skylight','Off-Roader']::text[]);
SELECT public._seed_fill_model('pickup','Mercedes-Benz','X-Class','x_class',10,'Pickup','2.3 dCi','Dizel',190,ARRAY['Progressive','Power']::text[]);
SELECT public._seed_fill_model('pickup','Mercedes-Benz','X-Class','x_class',10,'Pickup','3.0 V6','Dizel',258,ARRAY['Power']::text[]);
SELECT public._seed_fill_model('pickup','fiat','Fullback','fullback',10,'Pickup','2.4 Multijet','Dizel',180,ARRAY['SX','LX']::text[]);
SELECT public._seed_fill_model('pickup','mazda','BT-50','bt_50',10,'Pickup','3.2 TDCi','Dizel',200,ARRAY['Dynamic','Thunder']::text[]);
SELECT public._seed_fill_model('pickup','ssangyong','Musso','musso',10,'Pickup','2.2 Dizel','Dizel',181,ARRAY['Comfort','Grand']::text[]);
SELECT public._seed_fill_model('pickup','renault','Alaskan','alaskan',10,'Pickup','2.3 dCi','Dizel',190,ARRAY['Intens','Iconic']::text[]);
SELECT public._seed_fill_model('pickup','peugeot','Landtrek','landtrek',10,'Pickup','1.9 Dizel','Dizel',150,ARRAY['Active','Allure']::text[]);
SELECT public._seed_fill_model('pickup','chevrolet','Colorado','colorado',10,'Pickup','2.8 Duramax','Dizel',200,ARRAY['LT','Z71']::text[]);
SELECT public._seed_fill_model('pickup','chevrolet','Silverado','silverado',20,'Pickup','5.3 V8','Benzin',355,ARRAY['LT','LTZ']::text[]);
SELECT public._seed_fill_model('pickup','chevrolet','Silverado','silverado',20,'Pickup','6.2 V8','Benzin',420,ARRAY['LTZ','High Country']::text[]);
SELECT public._seed_fill_model('pickup','gmc','Sierra 1500','sierra_1500',10,'Pickup','5.3 V8','Benzin',355,ARRAY['SLE','SLT']::text[]);
SELECT public._seed_fill_model('pickup','gmc','Canyon','canyon',20,'Pickup','2.8 Duramax','Dizel',200,ARRAY['SLE','AT4']::text[]);
SELECT public._seed_fill_model('pickup','ram','1500','ram_1500',10,'Pickup','5.7 HEMI','Benzin',395,ARRAY['Big Horn','Laramie']::text[]);
SELECT public._seed_fill_model('pickup','dodge','Ram','ram',10,'Pickup','5.7 HEMI','Benzin',395,ARRAY['SLT','Laramie']::text[]);
SELECT public._seed_fill_model('pickup','honda','Ridgeline','ridgeline',10,'Pickup','3.5 V6','Benzin',280,ARRAY['RTL','Black Edition']::text[]);
SELECT public._seed_fill_model('pickup','jeep','Gladiator','gladiator',10,'Pickup','3.6 V6','Benzin',285,ARRAY['Sport','Rubicon']::text[]);
SELECT public._seed_fill_model('pickup','hyundai','Santa Cruz','santa_cruz',10,'Pickup','2.5 T-GDI','Benzin',281,ARRAY['SEL','Limited']::text[]);
SELECT public._seed_fill_model('pickup','kia','Tasman','tasman',10,'Pickup','2.2 Dizel','Dizel',202,ARRAY['Prestige','Gravity']::text[]);
SELECT public._seed_fill_model('pickup','maxus','T90','t90',10,'Pickup','2.0 Dizel','Dizel',163,ARRAY['Comfort','Luxury']::text[]);
SELECT public._seed_fill_model('pickup','jac','T8','t8',10,'Pickup','2.0 Dizel','Dizel',136,ARRAY['Comfort']::text[]);
SELECT public._seed_fill_model('pickup','gwm','Poer','poer',10,'Pickup','2.0 Dizel','Dizel',162,ARRAY['Comfort','Luxury']::text[]);
SELECT public._seed_fill_model('pickup','changan','Hunter','hunter',10,'Pickup','2.0 Dizel','Dizel',163,ARRAY['Comfort']::text[]);
SELECT public._seed_fill_model('pickup','byd','Shark','shark',10,'Pickup','1.5 Plug-in Hybrid','Hibrit',430,ARRAY['Comfort','Premium']::text[]);
SELECT public._seed_fill_model('pickup','tesla','Cybertruck','cybertruck',10,'Pickup','Tri Motor Elektrik','Elektrik',845,ARRAY['AWD','Cyberbeast']::text[]);

-- Fiat / Ford eksik modeller
SELECT public._seed_fill_model('otomobil','fiat','Idea','idea',40,'MPV','1.4 Fire','Benzin',77,ARRAY['Dynamic','Emotion']::text[]);
SELECT public._seed_fill_model('otomobil','fiat','Idea','idea',40,'MPV','1.3 Multijet','Dizel',70,ARRAY['Dynamic','Emotion']::text[]);
SELECT public._seed_fill_model('otomobil','fiat','Panda','panda',42,'Hatchback','1.2','Benzin',69,ARRAY['Pop','Lounge']::text[]);
SELECT public._seed_fill_model('otomobil','fiat','Panda','panda',42,'Hatchback','0.9 TwinAir','Benzin',85,ARRAY['Lounge','Cross']::text[]);
SELECT public._seed_fill_model('otomobil','fiat','Sinea','sinea',44,'Sedan','1.4 Fire','Benzin',77,ARRAY['Active','Dynamic']::text[]);
SELECT public._seed_fill_model('otomobil','fiat','Sinea','sinea',44,'Sedan','1.6','Benzin',103,ARRAY['Dynamic']::text[]);
SELECT public._seed_fill_model('otomobil','fiat','Stilo','stilo',46,'Hatchback','1.4','Benzin',95,ARRAY['Active','Dynamic']::text[]);
SELECT public._seed_fill_model('otomobil','fiat','Stilo','stilo',46,'Hatchback','1.6','Benzin',103,ARRAY['Dynamic']::text[]);
SELECT public._seed_fill_model('otomobil','fiat','Stilo','stilo',46,'Hatchback','1.9 JTD','Dizel',115,ARRAY['Dynamic']::text[]);
SELECT public._seed_fill_model('otomobil','ford','Festiva','festiva',80,'Hatchback','1.3','Benzin',63,ARRAY['L','LX']::text[]);
SELECT public._seed_fill_model('otomobil','ford','Granada','granada',82,'Sedan','2.0','Benzin',105,ARRAY['GL','Ghia']::text[]);
SELECT public._seed_fill_model('otomobil','ford','Granada','granada',82,'Sedan','2.3','Benzin',114,ARRAY['Ghia']::text[]);
SELECT public._seed_fill_model('otomobil','ford','Scorpio','scorpio',84,'Sedan','2.0','Benzin',115,ARRAY['GL','Ghia']::text[]);
SELECT public._seed_fill_model('otomobil','ford','Scorpio','scorpio',84,'Sedan','2.9','Benzin',145,ARRAY['Ghia']::text[]);
SELECT public._seed_fill_model('otomobil','ford','Sierra','sierra',86,'Sedan','1.6','Benzin',80,ARRAY['CL','Ghia']::text[]);
SELECT public._seed_fill_model('otomobil','ford','Sierra','sierra',86,'Sedan','2.0','Benzin',105,ARRAY['CL','Ghia']::text[]);

-- Marka iskeleti: MINI, Togg, Abarth, Geely, Maserati, Hummer, Range Rover
SELECT public._seed_fill_model('otomobil','mini','Cooper','cooper',10,'Hatchback','1.5','Benzin',136,ARRAY['Classic','Essential']::text[]);
SELECT public._seed_fill_model('otomobil','mini','Cooper','cooper',10,'Hatchback','2.0 Cooper S','Benzin',178,ARRAY['Cooper S','JCW']::text[]);
SELECT public._seed_fill_model('otomobil','mini','Cooper S','cooper_s',12,'Hatchback','2.0','Benzin',178,ARRAY['Cooper S','JCW']::text[]);
SELECT public._seed_fill_model('otomobil','mini','Clubman','clubman',14,'Station Wagon','1.5','Benzin',136,ARRAY['Classic','Cooper S']::text[]);
SELECT public._seed_fill_model('otomobil','mini','Cabrio','cabrio',16,'Cabrio','1.5','Benzin',136,ARRAY['Classic','Cooper S']::text[]);
SELECT public._seed_fill_model('suv_pickup','mini','Countryman','countryman',10,'SUV','1.5','Benzin',136,ARRAY['Classic','Cooper S']::text[]);
SELECT public._seed_fill_model('suv_pickup','mini','Countryman','countryman',10,'SUV','2.0 Cooper S','Benzin',178,ARRAY['Cooper S','JCW']::text[]);
SELECT public._seed_fill_model('suv_pickup','togg','T10X','t10x',10,'SUV','V1 RWD','Elektrik',160,ARRAY['V1','V2']::text[]);
SELECT public._seed_fill_model('suv_pickup','togg','T10X','t10x',10,'SUV','V2 AWD','Elektrik',218,ARRAY['V2']::text[]);
SELECT public._seed_fill_model('suv_pickup','togg','T10F','t10f',20,'Sedan','V1 RWD','Elektrik',160,ARRAY['V1','V2']::text[]);
SELECT public._seed_fill_model('suv_pickup','Range Rover','Evoque','evoque',10,'SUV','2.0 P200','Benzin',200,ARRAY['S','SE','HSE']::text[]);
SELECT public._seed_fill_model('suv_pickup','Range Rover','Velar','velar',20,'SUV','2.0 P250','Benzin',250,ARRAY['S','SE']::text[]);
SELECT public._seed_fill_model('suv_pickup','Range Rover','Sport','sport',30,'SUV','3.0 P400','Benzin',400,ARRAY['SE','HSE']::text[]);
SELECT public._seed_fill_model('suv_pickup','Range Rover','Vogue','vogue',40,'SUV','3.0 P400','Benzin',400,ARRAY['SE','Autobiography']::text[]);
SELECT public._seed_fill_model('otomobil','abarth','595','595',10,'Hatchback','1.4 T-Jet','Benzin',145,ARRAY['Turismo','Competizione']::text[]);
SELECT public._seed_fill_model('otomobil','abarth','500e','500e',20,'Hatchback','42 kWh Elektrik','Elektrik',155,ARRAY['Turismo']::text[]);
SELECT public._seed_fill_model('otomobil','abarth','124 Spider','124_spider',30,'Cabrio','1.4 MultiAir','Benzin',170,ARRAY['Turismo']::text[]);
SELECT public._seed_fill_model('otomobil','geely','Emgrand','emgrand',10,'Sedan','1.5','Benzin',114,ARRAY['Comfort','Luxury']::text[]);
SELECT public._seed_fill_model('otomobil','geely','Coolray','coolray',20,'SUV','1.5 Turbo','Benzin',177,ARRAY['Comfort','Luxury']::text[]);
SELECT public._seed_fill_model('otomobil','maserati','Ghibli','ghibli',10,'Sedan','3.0 V6','Benzin',350,ARRAY['GT','Modena']::text[]);
SELECT public._seed_fill_model('otomobil','maserati','Quattroporte','quattroporte',20,'Sedan','3.0 V6','Benzin',430,ARRAY['GT','Modena']::text[]);
SELECT public._seed_fill_model('otomobil','maserati','GranTurismo','granturismo',30,'Coupe','3.0 V6','Benzin',490,ARRAY['Modena','Trofeo']::text[]);
SELECT public._seed_fill_model('suv_pickup','maserati','Levante','levante',10,'SUV','3.0 V6','Benzin',350,ARRAY['GT','Modena','Trofeo']::text[]);
SELECT public._seed_fill_model('otomobil','hummer','H2','h2',10,'SUV','6.0 V8','Benzin',325,ARRAY['Adventure','Luxury']::text[]);
SELECT public._seed_fill_model('otomobil','hummer','H3','h3',20,'SUV','3.7','Benzin',245,ARRAY['Adventure','Luxury']::text[]);
SELECT public._seed_fill_model('suv_pickup','mahindra','XUV700','xuv700',10,'SUV','2.2 Dizel','Dizel',185,ARRAY['MX','AX7']::text[]);
SELECT public._seed_fill_model('suv_pickup','mahindra','Scorpio','scorpio',20,'SUV','2.2 Dizel','Dizel',132,ARRAY['S','Z']::text[]);

-- ATV
SELECT public._seed_fill_model('atv_utv','polaris','Sportsman 570','sportsman_570',10,'ATV','570 cc','Benzin',44,ARRAY['Standart','EPS']::text[]);
SELECT public._seed_fill_model('atv_utv','polaris','RZR 1000','rzr_1000',20,'UTV','1000 cc','Benzin',110,ARRAY['Sport','Ultimate']::text[]);
SELECT public._seed_fill_model('atv_utv','Can-Am','Outlander 650','outlander_650',10,'ATV','650 cc','Benzin',62,ARRAY['DPS','XT']::text[]);
SELECT public._seed_fill_model('atv_utv','Can-Am','Maverick X3','maverick_x3',20,'UTV','900 cc','Benzin',180,ARRAY['DS','X rs']::text[]);
SELECT public._seed_fill_model('atv_utv','Yamaha Motor Company','Grizzly 700','grizzly_700',10,'ATV','700 cc','Benzin',48,ARRAY['Standart','EPS']::text[]);
SELECT public._seed_fill_model('atv_utv','Yamaha Motor Company','Raptor 700','raptor_700',20,'ATV','700 cc','Benzin',48,ARRAY['Standart']::text[]);
SELECT public._seed_fill_model('atv_utv','Arctic Cat','Wildcat XX','wildcat_xx',10,'UTV','998 cc','Benzin',125,ARRAY['Standart']::text[]);
SELECT public._seed_fill_model('atv_utv','Segway Powersports','Villain SX10','villain_sx10',10,'UTV','1000 cc','Benzin',101,ARRAY['Standart']::text[]);

-- Hasarlı: otomobil + SUV katalog kopyası
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT has.id AS dst, src.id AS src
    FROM public.vehicle_brands has
    JOIN public.categories ch ON ch.id = has.category_id AND ch.code = 'hasarli'
    JOIN public.vehicle_brands src ON lower(src.code) = lower(has.code)
    JOIN public.categories cs ON cs.id = src.category_id AND cs.code = 'otomobil'
  LOOP
    PERFORM public._clone_catalog_brand(r.src, r.dst);
  END LOOP;

  FOR r IN
    SELECT has.id AS dst, src.id AS src
    FROM public.vehicle_brands has
    JOIN public.categories ch ON ch.id = has.category_id AND ch.code = 'hasarli'
    JOIN public.vehicle_brands src ON lower(src.code) = lower(has.code)
    JOIN public.categories cs ON cs.id = src.category_id AND cs.code = 'suv_pickup'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.vehicle_brand_models m
      WHERE m.brand_id = has.id AND lower(coalesce(m.code,'')) <> 'diger_modeller'
    )
  LOOP
    PERFORM public._clone_catalog_brand(r.src, r.dst);
  END LOOP;
END;
$$;

-- Scooter / karavan / deniz / hava / klasik varsayılan modeller
INSERT INTO public.vehicle_brand_models (brand_id, name, code, sort_order)
SELECT vb.id, x.name, x.code, x.sort_order
FROM public.vehicle_brands vb
JOIN public.categories c ON c.id = vb.category_id
CROSS JOIN LATERAL (
  SELECT * FROM (
    VALUES
      ('scooter_bisiklet','Elektrikli Scooter','elektrikli_scooter',10),
      ('scooter_bisiklet','Elektrikli Bisiklet','elektrikli_bisiklet',20),
      ('karavan','Alcova','alcova',10),
      ('karavan','Profili','profili',20),
      ('karavan','Integral','integral',30),
      ('karavan','Van','van',40),
      ('karavan','Çekme Karavan','cekme_karavan',50),
      ('klasik','Klasik Otomobil','klasik_otomobil',10),
      ('deniz','Tekne','tekne',10),
      ('deniz','Yat','yat',20),
      ('deniz','Jet Ski','jet_ski',30),
      ('hava','Uçak','ucak',10),
      ('hava','Helikopter','helikopter',20)
  ) AS t(cat, name, code, sort_order)
  WHERE t.cat = c.code
) x
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_brand_models m
  WHERE m.brand_id = vb.id AND lower(coalesce(m.code,'')) <> 'diger_modeller'
)
ON CONFLICT (brand_id, code) DO NOTHING;

-- Motosiklet + kalan modellere kasa
INSERT INTO public.vehicle_model_body_styles (model_id, name, sort_order)
SELECT m.id,
  CASE c.code
    WHEN 'motosiklet' THEN 'Standart'
    WHEN 'pickup' THEN 'Pickup'
    WHEN 'scooter_bisiklet' THEN 'Standart'
    WHEN 'karavan' THEN 'Karavan'
    WHEN 'klasik' THEN 'Klasik'
    WHEN 'deniz' THEN 'Deniz'
    WHEN 'hava' THEN 'Hava'
    WHEN 'atv_utv' THEN 'ATV'
    ELSE COALESCE(NULLIF(m.body_type,''), 'Standart')
  END,
  10
FROM public.vehicle_brand_models m
JOIN public.vehicle_brands vb ON vb.id = m.brand_id
JOIN public.categories c ON c.id = vb.category_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_model_body_styles s WHERE s.model_id = m.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.vehicle_brand_models ch
  WHERE ch.brand_id = m.brand_id AND ch.line_group = m.name
)
ON CONFLICT (model_id, name) DO NOTHING;

-- Kasa var motor yok
INSERT INTO public.vehicle_body_style_engines (body_style_id, name, fuel_type, horsepower, sort_order)
SELECT s.id,
  CASE
    WHEN c.code = 'motosiklet' THEN COALESCE((regexp_match(m.name, '(\d{2,4})'))[1] || ' cc', 'Standart')
    WHEN c.code = 'scooter_bisiklet' THEN 'Elektrik'
    WHEN c.code IN ('deniz','hava') THEN 'Standart'
    ELSE 'Standart'
  END,
  CASE
    WHEN c.code IN ('scooter_bisiklet') THEN 'Elektrik'
    WHEN lower(vb.name) LIKE '%zero%' THEN 'Elektrik'
    WHEN c.code IN ('deniz','hava') THEN 'Benzin'
    ELSE 'Benzin'
  END,
  m.horsepower,
  10
FROM public.vehicle_model_body_styles s
JOIN public.vehicle_brand_models m ON m.id = s.model_id
JOIN public.vehicle_brands vb ON vb.id = m.brand_id
JOIN public.categories c ON c.id = vb.category_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_body_style_engines e WHERE e.body_style_id = s.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.vehicle_brand_models ch
  WHERE ch.brand_id = m.brand_id AND ch.line_group = m.name
)
ON CONFLICT (body_style_id, name) DO NOTHING;

-- Paketsiz motorlara Standart
INSERT INTO public.vehicle_engine_packages (engine_id, name, sort_order)
SELECT e.id, 'Standart', 10
FROM public.vehicle_body_style_engines e
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_engine_packages p WHERE p.engine_id = e.id
)
ON CONFLICT (engine_id, name) DO NOTHING;

-- Ford / Fiat mevcut motorlara trim paket
INSERT INTO public.vehicle_engine_packages (engine_id, name, sort_order)
SELECT e.id, pkg.name, pkg.sort_order
FROM public.vehicle_body_style_engines e
JOIN public.vehicle_model_body_styles s ON s.id = e.body_style_id
JOIN public.vehicle_brand_models m ON m.id = s.model_id
JOIN public.vehicle_brands vb ON vb.id = m.brand_id
JOIN public.categories c ON c.id = vb.category_id AND c.code = 'otomobil'
CROSS JOIN LATERAL (
  SELECT * FROM (VALUES
    ('ford','Trend',20),
    ('ford','Titanium',30),
    ('fiat','Easy',20),
    ('fiat','Lounge',30)
  ) AS t(brand, name, sort_order)
  WHERE t.brand = lower(vb.code)
) pkg
ON CONFLICT (engine_id, name) DO NOTHING;

-- Hâlâ modeli olmayan markaya Diğer Modeller + Standart zincir
INSERT INTO public.vehicle_brand_models (brand_id, name, code, sort_order)
SELECT vb.id, 'Diğer Modeller', 'diger_modeller', 9999
FROM public.vehicle_brands vb
WHERE NOT EXISTS (SELECT 1 FROM public.vehicle_brand_models m WHERE m.brand_id = vb.id)
ON CONFLICT (brand_id, code) DO NOTHING;

INSERT INTO public.vehicle_model_body_styles (model_id, name, sort_order)
SELECT m.id, 'Standart', 10
FROM public.vehicle_brand_models m
WHERE NOT EXISTS (SELECT 1 FROM public.vehicle_model_body_styles s WHERE s.model_id = m.id)
AND NOT EXISTS (
  SELECT 1 FROM public.vehicle_brand_models ch
  WHERE ch.brand_id = m.brand_id AND ch.line_group = m.name
)
ON CONFLICT (model_id, name) DO NOTHING;

INSERT INTO public.vehicle_body_style_engines (body_style_id, name, fuel_type, sort_order)
SELECT s.id, 'Standart', 'Benzin', 10
FROM public.vehicle_model_body_styles s
JOIN public.vehicle_brand_models m ON m.id = s.model_id
WHERE NOT EXISTS (SELECT 1 FROM public.vehicle_body_style_engines e WHERE e.body_style_id = s.id)
AND NOT EXISTS (
  SELECT 1 FROM public.vehicle_brand_models ch
  WHERE ch.brand_id = m.brand_id AND ch.line_group = m.name
)
ON CONFLICT (body_style_id, name) DO NOTHING;

INSERT INTO public.vehicle_engine_packages (engine_id, name, sort_order)
SELECT e.id, 'Standart', 10
FROM public.vehicle_body_style_engines e
WHERE NOT EXISTS (SELECT 1 FROM public.vehicle_engine_packages p WHERE p.engine_id = e.id)
ON CONFLICT (engine_id, name) DO NOTHING;

DROP FUNCTION IF EXISTS public._seed_fill_model(text, text, text, text, int, text, text, text, int, text[]);
DROP FUNCTION IF EXISTS public._clone_catalog_brand(uuid, uuid);
