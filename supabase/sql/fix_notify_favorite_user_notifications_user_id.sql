-- Favoriye ekleme sonrası bildirim tetikleyicisini user_notifications.user_id ile uyumlu hale getirir.
-- Hata: column "recipient_id" of relation "user_notifications" does not exist [42703]
-- Supabase SQL Editor'da bir kez çalıştırın.

-- Eski sütun adlarını güvenli şekilde user_id'ye normalize et.
DO $fix_notif_col$
BEGIN
  IF to_regclass('public.user_notifications') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_notifications'
        AND column_name = 'user_id'
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_notifications'
          AND column_name = 'recipient_id'
      ) THEN
        ALTER TABLE public.user_notifications
          RENAME COLUMN recipient_id TO user_id;
      ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_notifications'
          AND column_name = 'profile_id'
      ) THEN
        ALTER TABLE public.user_notifications
          RENAME COLUMN profile_id TO user_id;
      END IF;
    END IF;
  END IF;
END
$fix_notif_col$;

-- user_favorites üzerindeki eski/uyumsuz bildirim trigger'larını temizle.
DO $drop_old_fav_triggers$
DECLARE
  rec record;
BEGIN
  IF to_regclass('public.user_favorites') IS NULL THEN
    RETURN;
  END IF;

  FOR rec IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'public.user_favorites'::regclass
      AND NOT t.tgisinternal
      AND (
        p.proname ILIKE '%favorite%'
        OR p.prosrc ILIKE '%user_notifications%'
        OR p.prosrc ILIKE '%recipient_id%'
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.user_favorites', rec.tgname);
  END LOOP;
END
$drop_old_fav_triggers$;

create or replace function public.notify_favorite_receiver()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  listing_owner uuid;
begin
  select l.user_id
    into listing_owner
  from public.listings l
  where l.id = new.listing_id;

  -- İlan bulunamazsa veya kişi kendi ilanını favorilediyse bildirim üretme.
  if listing_owner is null or listing_owner = new.user_id then
    return new;
  end if;

  insert into public.user_notifications (user_id, type, title, body, listing_id)
  values (
    listing_owner,
    'favorite',
    'İlanınız favorilere eklendi',
    'Bir kullanıcı ilanınızı favorilere ekledi.',
    new.listing_id
  );

  return new;
end;
$fn$;

drop trigger if exists notify_favorite_receiver on public.user_favorites;
create trigger notify_favorite_receiver
  after insert on public.user_favorites
  for each row
  execute function public.notify_favorite_receiver();
