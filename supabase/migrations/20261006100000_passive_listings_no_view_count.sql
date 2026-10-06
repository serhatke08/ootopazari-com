-- Pasif / pazarda olmayan ilanlarda görüntülenme artmasın.
-- Hem listings.view_count hem listing_views insert yolu kilitlenir.

BEGIN;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.listing_counts_views(p_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings l
    WHERE l.id = p_listing_id
      AND l.activation_status = 'active'
      AND COALESCE(l.exclude_from_marketplace, false) = false
      AND (
        l.moderation_status IS NULL
        OR l.moderation_status = 'approved'
      )
  );
$$;

COMMENT ON FUNCTION public.listing_counts_views(uuid) IS
  'true ise görüntülenme sayılır (yalnızca aktif + onaylı + pazarda).';

CREATE OR REPLACE FUNCTION public.increment_listing_view(listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF listing_id IS NULL THEN
    RETURN;
  END IF;
  IF NOT public.listing_counts_views(listing_id) THEN
    RETURN;
  END IF;

  UPDATE public.listings
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.listing_counts_views(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.listing_views_block_passive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.listing_counts_views(NEW.listing_id) THEN
    -- Insert’i yut: pasif ilanda satır yazılmaz, sayaç yerinde kalır.
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listing_views_block_passive ON public.listing_views;
CREATE TRIGGER trg_listing_views_block_passive
  BEFORE INSERT ON public.listing_views
  FOR EACH ROW
  EXECUTE FUNCTION public.listing_views_block_passive();

COMMIT;
