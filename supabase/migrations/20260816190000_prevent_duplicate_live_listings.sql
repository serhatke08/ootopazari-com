-- Aynı kullanıcının aynı canlı ilanı birden fazla kez yayınlamasını engelle.

with ranked as (
  select
    id,
    row_number() over (
      partition by
        user_id,
        lower(btrim(coalesce(title, ''))),
        coalesce(price, 0),
        coalesce(vehicle_model, ''),
        coalesce(vehicle_year, 0),
        coalesce(vehicle_mileage, -1),
        coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid)
      order by created_at desc
    ) as rn
  from public.listings
  where moderation_status is null
     or moderation_status in ('pending', 'approved')
)
update public.listings
set
  moderation_status = 'rejected',
  moderation_reason = 'Aynı ilanın kopyası'
where id in (select id from ranked where rn > 1);

create or replace function public.prevent_duplicate_live_listing()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null then
    return new;
  end if;

  if new.moderation_status is not null
     and new.moderation_status not in ('pending', 'approved') then
    return new;
  end if;

  if exists (
    select 1
    from public.listings l
    where l.user_id = new.user_id
      and l.id is distinct from new.id
      and (
        l.moderation_status is null
        or l.moderation_status in ('pending', 'approved')
      )
      and lower(btrim(coalesce(l.title, ''))) = lower(btrim(coalesce(new.title, '')))
      and coalesce(l.price, 0) = coalesce(new.price, 0)
      and coalesce(l.vehicle_model, '') = coalesce(new.vehicle_model, '')
      and coalesce(l.vehicle_year, 0) = coalesce(new.vehicle_year, 0)
      and coalesce(l.vehicle_mileage, -1) = coalesce(new.vehicle_mileage, -1)
      and coalesce(l.category_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = coalesce(new.category_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'Aynı ilan zaten yayında. Tekrar yayınlanamaz.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_duplicate_live_listing on public.listings;
create trigger trg_prevent_duplicate_live_listing
before insert or update of
  title, price, vehicle_model, vehicle_year, vehicle_mileage, category_id, moderation_status, user_id
on public.listings
for each row
execute function public.prevent_duplicate_live_listing();

create unique index if not exists listings_no_duplicate_live_idx
on public.listings (
  user_id,
  lower(btrim(coalesce(title, ''))),
  coalesce(price, 0),
  coalesce(vehicle_model, ''),
  coalesce(vehicle_year, 0),
  coalesce(vehicle_mileage, -1),
  coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
where moderation_status is null
   or moderation_status in ('pending', 'approved');
