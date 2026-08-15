-- İlan süresi (30 gün) + yıllık 5 ücretsiz ilan hakkı.
-- Supabase SQL Editor’da bir kez çalıştırın (veya migrate).

alter table public.listings
  add column if not exists activated_at timestamptz;

update public.listings
set activated_at = coalesce(activated_at, created_at, now())
where activated_at is null;

alter table public.listings
  alter column activated_at set default now();

alter table public.listings
  drop constraint if exists listings_moderation_status_check;

alter table public.listings
  add constraint listings_moderation_status_check
    check (
      moderation_status is null
      or moderation_status in (
        'pending',
        'approved',
        'rejected',
        'suspended',
        'expired'
      )
    );

comment on column public.listings.activated_at is
  'Yayına alındığı / yeniden aktif edildiği an. 30 gün sonra pasife (expired) düşer.';

alter table public.listings
  add column if not exists expired_at timestamptz;

comment on column public.listings.expired_at is
  'Pasife alındığı an. 5 gün sonra ilan kalıcı silinir.';

create table if not exists public.listing_quota_uses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  kind text not null check (kind in ('create', 'reactivate')),
  created_at timestamptz not null default now()
);

create index if not exists listing_quota_uses_user_year_idx
  on public.listing_quota_uses (user_id, created_at desc);

create unique index if not exists listing_quota_uses_create_once
  on public.listing_quota_uses (listing_id)
  where kind = 'create' and listing_id is not null;

alter table public.listing_quota_uses enable row level security;

drop policy if exists listing_quota_uses_select_own on public.listing_quota_uses;
create policy listing_quota_uses_select_own
  on public.listing_quota_uses
  for select
  using (auth.uid() = user_id);

drop policy if exists listing_quota_uses_insert_own on public.listing_quota_uses;
create policy listing_quota_uses_insert_own
  on public.listing_quota_uses
  for insert
  with check (auth.uid() = user_id);

insert into public.listing_quota_uses (user_id, listing_id, kind, created_at)
select l.user_id, l.id, 'create', l.created_at
from public.listings l
where l.user_id is not null
  and l.created_at >= date_trunc('year', timezone('Europe/Istanbul', now()))
  and not exists (
    select 1
    from public.listing_quota_uses u
    where u.listing_id = l.id
      and u.kind = 'create'
  );

update public.listings
set
  moderation_status = 'expired',
  expired_at = coalesce(expired_at, now()),
  suspension_reason = coalesce(
    nullif(suspension_reason, ''),
    'İlan süresi (30 gün) doldu.'
  )
where lower(coalesce(moderation_status, '')) = 'approved'
  and coalesce(activated_at, created_at, now()) < now() - interval '30 days';

update public.listings
set expired_at = coalesce(expired_at, now())
where lower(coalesce(moderation_status, '')) = 'expired'
  and expired_at is null;
