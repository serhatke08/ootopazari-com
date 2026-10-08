-- Mağaza yalnızca TR. Eski uygulama `.eq(country_id, TR)` kullandığı için
-- listings.country_id asla null / başka ülke kalamaz.

CREATE OR REPLACE FUNCTION public.listings_force_turkey_country_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.country_id := '00000000-0000-0000-0000-000000000001'::uuid;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'listings',
    'kiralik_listings',
    'galeri_listings',
    'expertiz_listings',
    'parcaci_listings'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t
        AND column_name = 'country_id'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I SET country_id = %L::uuid WHERE country_id IS DISTINCT FROM %L::uuid',
        t,
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001'
      );
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN country_id SET DEFAULT %L::uuid',
        t,
        '00000000-0000-0000-0000-000000000001'
      );
      EXECUTE format('DROP TRIGGER IF EXISTS trg_force_turkey_country_id ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_force_turkey_country_id
         BEFORE INSERT OR UPDATE ON public.%I
         FOR EACH ROW
         EXECUTE FUNCTION public.listings_force_turkey_country_id()',
        t
      );
    END IF;
  END LOOP;
END;
$$;
