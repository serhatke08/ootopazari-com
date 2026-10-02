-- Mirror of migration 20261002010000 — pasif ilan arşivi.
-- Kaynak: supabase/migrations/20261002010000_listings_archived_grace_15d.sql

create table if not exists public.listings_archived (
  id uuid primary key,
  archived_at timestamptz not null default now(),
  archive_reason text not null default 'expired_grace_15d',
  listing_number bigint,
  user_id uuid,
  title text,
  price numeric,
  category_id uuid,
  city_id uuid,
  vehicle_brand_id uuid,
  vehicle_model text,
  vehicle_year integer,
  image_url text,
  created_at timestamptz,
  activated_at timestamptz,
  expired_at timestamptz,
  moderation_status text,
  activation_status text,
  payload jsonb not null
);
