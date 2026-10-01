-- App + web ortak ilan taslağı (kullanıcı başına 1 satır)
create table if not exists public.listing_drafts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists listing_drafts_updated_at_idx
  on public.listing_drafts (updated_at desc);

alter table public.listing_drafts enable row level security;

drop policy if exists listing_drafts_select_own on public.listing_drafts;
create policy listing_drafts_select_own
  on public.listing_drafts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists listing_drafts_insert_own on public.listing_drafts;
create policy listing_drafts_insert_own
  on public.listing_drafts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists listing_drafts_update_own on public.listing_drafts;
create policy listing_drafts_update_own
  on public.listing_drafts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists listing_drafts_delete_own on public.listing_drafts;
create policy listing_drafts_delete_own
  on public.listing_drafts for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.listing_drafts to authenticated;
grant all on public.listing_drafts to service_role;
