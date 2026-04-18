-- Supabase SQL Editor’da bir kez çalıştırın.
-- Askıya alınan ilanlar: yayından düşer; sahibi hesabında görür + bildirim tablosu.

-- Bazı projelerde admin_profiles PK sütunu "id" olarak kalmış olabilir; uygulama ve politikalar "user_id" bekler.
DO $fix_admin$
BEGIN
  IF to_regclass('public.admin_profiles') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'admin_profiles' AND column_name = 'id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'admin_profiles' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.admin_profiles RENAME COLUMN id TO user_id;
    END IF;
  END IF;
END
$fix_admin$;

alter table public.listings
  add column if not exists suspension_reason text;

alter table public.listings
  add column if not exists suspended_at timestamptz;

-- moderation_status = 'suspended' için veritabanı CHECK kısıtını güncellemeniz gerekir:
-- → supabase/sql/listings_moderation_status_add_suspended.sql
comment on column public.listings.suspension_reason is 'Askıya alma gerekçesi (yalnızca moderation_status = suspended iken dolu).';

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'listing_suspended',
  title text not null,
  body text,
  listing_id uuid references public.listings (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Eski tabloda alıcı sütunu farklı isimdeyse user_id ile uyumla
DO $fix_notif$
BEGIN
  IF to_regclass('public.user_notifications') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_notifications' AND column_name = 'user_id'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_notifications' AND column_name = 'recipient_id'
      ) THEN
        ALTER TABLE public.user_notifications RENAME COLUMN recipient_id TO user_id;
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_notifications' AND column_name = 'profile_id'
      ) THEN
        ALTER TABLE public.user_notifications RENAME COLUMN profile_id TO user_id;
      END IF;
    END IF;
  END IF;
END
$fix_notif$;

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

alter table public.user_notifications enable row level security;

drop policy if exists "user_notifications_select_own" on public.user_notifications;
create policy "user_notifications_select_own"
  on public.user_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_notifications_update_own" on public.user_notifications;
create policy "user_notifications_update_own"
  on public.user_notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, update on public.user_notifications to authenticated;

-- İsteğe bağlı: admin hesabı başka kullanıcıların askıdaki ilanını ilan detayda okuyabilsin.
-- (Mevcut listings politikalarınızla çakışırsa önce inceleyin; gerekirse birleştirin.)
drop policy if exists "listings_select_admin_all" on public.listings;
create policy "listings_select_admin_all"
  on public.listings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_profiles a
      where a.user_id = auth.uid()
    )
  );
