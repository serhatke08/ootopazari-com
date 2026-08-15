-- İlan süresi (30 gün) + yıllık 5 ücretsiz ilan hakkı.

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
