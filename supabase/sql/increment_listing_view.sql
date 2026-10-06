-- Supabase SQL Editor’da bir kez çalıştırın.
-- Pasif ilanlarda görüntülenme ASLA artmaz (view_count + listing_views).

alter table public.listings
  add column if not exists view_count integer not null default 0;

create or replace function public.listing_counts_views(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.listings l
    where l.id = p_listing_id
      and l.activation_status = 'active'
      and coalesce(l.exclude_from_marketplace, false) = false
      and (
        l.moderation_status is null
        or l.moderation_status = 'approved'
      )
  );
$$;

create or replace function public.increment_listing_view(listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if listing_id is null then
    return;
  end if;
  if not public.listing_counts_views(listing_id) then
    return;
  end if;

  update public.listings
  set view_count = coalesce(view_count, 0) + 1
  where id = listing_id;
end;
$$;

grant execute on function public.listing_counts_views(uuid) to anon, authenticated, service_role;
grant execute on function public.increment_listing_view(uuid) to anon, authenticated, service_role;

create or replace function public.listing_views_block_passive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.listing_counts_views(new.listing_id) then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_listing_views_block_passive on public.listing_views;
create trigger trg_listing_views_block_passive
  before insert on public.listing_views
  for each row
  execute function public.listing_views_block_passive();
