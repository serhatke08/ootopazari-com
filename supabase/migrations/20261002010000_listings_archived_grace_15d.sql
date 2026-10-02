-- Pasif (expired) ilanlar 15 gün hesapta kalır; sonra listings'ten çıkarılıp
-- listings_archived'a kopyalanır (veri analizi). Hard delete yok.

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

comment on table public.listings_archived is
  'Süresi dolmuş pasif ilanların listings dışı arşivi (analiz). Hesapta gösterilmez.';

create index if not exists listings_archived_archived_at_idx
  on public.listings_archived (archived_at desc);

create index if not exists listings_archived_user_id_idx
  on public.listings_archived (user_id);

create index if not exists listings_archived_listing_number_idx
  on public.listings_archived (listing_number);

create index if not exists listings_archived_expired_at_idx
  on public.listings_archived (expired_at);

alter table public.listings_archived enable row level security;

-- Authenticated kullanıcı okuyamaz/yazamaz; yalnızca service_role (cron).
revoke all on table public.listings_archived from anon, authenticated;
grant select, insert, update, delete on table public.listings_archived to service_role;
