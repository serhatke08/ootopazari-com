-- Supabase SQL Editor’da bir kez çalıştırın.
-- Görüntülenme sayacı + güvenli artırım (RLS ilan güncellemesini engellese bile çalışır)

alter table public.listings
  add column if not exists view_count integer not null default 0;

create or replace function public.increment_listing_view(listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings
  set view_count = coalesce(view_count, 0) + 1
  where id = listing_id;
end;
$$;

grant execute on function public.increment_listing_view(uuid) to anon, authenticated;
