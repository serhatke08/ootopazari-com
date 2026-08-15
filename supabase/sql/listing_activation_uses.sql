-- Mobil ile aynı kota kaynağı. Tablo zaten varsa bu dosya no-op’dur.
-- Kota: son 365 günde kind = 'free' satır sayısı (kayan 12 ay).

create table if not exists public.listing_activation_uses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid,
  listing_table text not null default 'listings',
  kind text not null check (kind in ('free', 'paid', 'membership')),
  used_at timestamptz not null default now()
);

create index if not exists listing_activation_uses_user_free_idx
  on public.listing_activation_uses (user_id, kind, used_at desc);

alter table public.listing_activation_uses enable row level security;

drop policy if exists listing_activation_uses_select_own on public.listing_activation_uses;
create policy listing_activation_uses_select_own
  on public.listing_activation_uses
  for select
  using (auth.uid() = user_id);

drop policy if exists listing_activation_uses_insert_own on public.listing_activation_uses;
create policy listing_activation_uses_insert_own
  on public.listing_activation_uses
  for insert
  with check (auth.uid() = user_id);
