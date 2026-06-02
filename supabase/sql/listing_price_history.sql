-- Fiyat geçmişi + fiyat değişince oyları sıfırlama (mobil ile uyumlu akış)

create table if not exists public.listing_price_history (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  price numeric not null,
  rating_average numeric,
  rating_count integer not null default 0,
  rating_fair_count integer not null default 0,
  rating_expensive_count integer not null default 0,
  rating_exorbitant_count integer not null default 0,
  recorded_at timestamptz not null default now()
);

create index if not exists listing_price_history_listing_id_idx
  on public.listing_price_history (listing_id, recorded_at desc);

alter table public.listing_price_history enable row level security;

drop policy if exists listing_price_history_select_public on public.listing_price_history;
create policy listing_price_history_select_public
  on public.listing_price_history
  for select
  to anon, authenticated
  using (true);

-- Fiyat değişince: eski fiyat + oylama özeti kaydet, oyları sıfırla
create or replace function public.handle_listing_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  avg_r numeric;
  cnt int;
  c1 int;
  c2 int;
  c3 int;
begin
  if tg_op = 'UPDATE' and old.price is not distinct from new.price then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.price is distinct from new.price then
    select
      avg(rating)::numeric,
      count(*)::int,
      count(*) filter (where rating = 1)::int,
      count(*) filter (where rating = 2)::int,
      count(*) filter (where rating = 3)::int
    into avg_r, cnt, c1, c2, c3
    from public.listing_price_ratings
    where listing_id = old.id;

    insert into public.listing_price_history (
      listing_id,
      price,
      rating_average,
      rating_count,
      rating_fair_count,
      rating_expensive_count,
      rating_exorbitant_count
    ) values (
      old.id,
      old.price,
      avg_r,
      coalesce(cnt, 0),
      coalesce(c1, 0),
      coalesce(c2, 0),
      coalesce(c3, 0)
    );

    delete from public.listing_price_ratings where listing_id = old.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_listing_price_change on public.listings;
create trigger trg_listing_price_change
  after update of price on public.listings
  for each row
  execute function public.handle_listing_price_change();
