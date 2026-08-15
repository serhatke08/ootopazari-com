-- Mobil ile aynı kota kaynağı.
-- Kota: son 365 günde kind = 'free' satır sayısı (kayan 12 ay).
-- İlan silinince satır KALIR → hak geri gelmez.

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

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'listing_activation_uses'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike '%listings%'
  loop
    execute format(
      'alter table public.listing_activation_uses drop constraint if exists %I',
      r.conname
    );
  end loop;
end $$;

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

drop policy if exists listing_activation_uses_update_own on public.listing_activation_uses;
drop policy if exists listing_activation_uses_delete_own on public.listing_activation_uses;

revoke update, delete on public.listing_activation_uses from anon, authenticated;
