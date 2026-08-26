-- Acil ilan sistemi (öne çıkarma / feature_boost'tan bağımsız).
-- Paketler: 5 gün = 289 TL, 15 gün = 620 TL.
-- Ayrıca: expireDueListings için moderation_status 'expired' izni.

-- 1) expired + suspended birlikte (uzak DB eski constraint'te expired yoksa hata veriyordu)
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

-- 2) listings acil alanları
alter table public.listings
  add column if not exists acil_until timestamptz,
  add column if not exists acil_started_at timestamptz,
  add column if not exists acil_pack_days integer;

create index if not exists listings_acil_until_live_idx
  on public.listings (acil_until desc)
  where acil_until is not null;

comment on column public.listings.acil_until is
  'Acil vitrin bitişi; yalnızca /acil ve ana sayfa Acil satırı + kategori/marka önceliği';
comment on column public.listings.acil_pack_days is
  'Aktif acil paket günü (5 veya 15)';

-- 3) satın alma / hediye kayıtları
create table if not exists public.acil_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  listing_id uuid not null references public.listings (id) on delete cascade,
  platform text not null default 'web',
  product_id text not null,
  transaction_id text not null,
  days integer not null check (days > 0),
  amount_kurus integer,
  status text not null default 'applied'
    check (status in ('pending', 'applied', 'failed')),
  verified_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (platform, transaction_id)
);

create index if not exists acil_purchases_listing_id_idx
  on public.acil_purchases (listing_id);

create index if not exists acil_purchases_user_id_idx
  on public.acil_purchases (user_id);

alter table public.acil_purchases enable row level security;

-- 4) ödeme siparişleri (PayTR — ileride checkout)
create table if not exists public.acil_payments (
  merchant_oid text primary key,
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null,
  pack_days integer not null check (pack_days in (5, 15)),
  amount_kurus integer not null check (amount_kurus > 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed')),
  paytr_status text,
  total_amount_kurus integer,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists acil_payments_listing_id_idx
  on public.acil_payments (listing_id);

alter table public.acil_payments enable row level security;

-- 5) alan koruma (yalnızca internal flag ile yazılır)
create or replace function public.listings_guard_acil_fields()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.acil_internal', true) = 'on' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.acil_until is distinct from old.acil_until
      or new.acil_started_at is distinct from old.acil_started_at
      or new.acil_pack_days is distinct from old.acil_pack_days
    then
      raise exception 'acil fields can only be set via register_acil_purchase';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists listings_guard_acil_fields_trg on public.listings;
create trigger listings_guard_acil_fields_trg
  before update of acil_until, acil_started_at, acil_pack_days
  on public.listings
  for each row
  execute function public.listings_guard_acil_fields();

-- 6) register / stack acil
create or replace function public.register_acil_purchase(
  p_user_id uuid,
  p_listing_id uuid,
  p_product_id text,
  p_transaction_id text,
  p_days integer,
  p_amount_kurus integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings%rowtype;
  v_pack_days integer;
  v_amount integer;
  v_existing public.acil_purchases%rowtype;
  v_started timestamptz := now();
  v_until timestamptz;
  v_campaign_start timestamptz;
  v_new_pack_days integer;
  v_active boolean;
  v_purchase_id uuid;
begin
  if p_transaction_id is null or btrim(p_transaction_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_transaction_id');
  end if;

  v_pack_days := case p_product_id
    when 'acil_5d' then 5
    when 'acil_15d' then 15
    else null
  end;

  v_amount := case p_product_id
    when 'acil_5d' then 28900
    when 'acil_15d' then 62000
    else null
  end;

  if v_pack_days is null or p_days is null or p_days <> v_pack_days then
    return jsonb_build_object('ok', false, 'error', 'invalid_pack');
  end if;

  if p_amount_kurus is not null then
    v_amount := p_amount_kurus;
  end if;

  select *
    into v_existing
  from public.acil_purchases
  where platform = 'web'
    and transaction_id = p_transaction_id
  limit 1;

  if found then
    select acil_until, acil_pack_days
      into v_until, v_pack_days
    from public.listings
    where id = p_listing_id;

    return jsonb_build_object(
      'ok', true,
      'already_applied', true,
      'listing_id', p_listing_id,
      'purchase_id', v_existing.id,
      'acil_until', v_until,
      'acil_pack_days', v_pack_days
    );
  end if;

  select *
    into v_listing
  from public.listings
  where id = p_listing_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  if v_listing.user_id is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_listing.moderation_status is distinct from 'approved' then
    return jsonb_build_object('ok', false, 'error', 'listing_not_approved');
  end if;

  v_active := v_listing.acil_until is not null
    and v_listing.acil_until > v_started;

  if v_active then
    v_campaign_start := coalesce(v_listing.acil_started_at, v_started);
    v_new_pack_days := coalesce(v_listing.acil_pack_days, 0) + p_days;
    v_until := v_campaign_start + make_interval(days => v_new_pack_days);
  else
    v_campaign_start := v_started;
    v_new_pack_days := p_days;
    v_until := v_started + make_interval(days => p_days);
  end if;

  perform set_config('app.acil_internal', 'on', true);

  update public.listings
  set
    acil_started_at = case
      when v_active then coalesce(v_listing.acil_started_at, v_campaign_start)
      else v_started
    end,
    acil_pack_days = v_new_pack_days,
    acil_until = v_until
  where id = p_listing_id;

  insert into public.acil_purchases (
    user_id,
    listing_id,
    platform,
    product_id,
    transaction_id,
    days,
    amount_kurus,
    status,
    verified_at,
    applied_at
  )
  values (
    p_user_id,
    p_listing_id,
    'web',
    p_product_id,
    p_transaction_id,
    p_days,
    v_amount,
    'applied',
    v_started,
    v_started
  )
  returning id into v_purchase_id;

  return jsonb_build_object(
    'ok', true,
    'days', p_days,
    'listing_id', p_listing_id,
    'purchase_id', v_purchase_id,
    'acil_until', v_until,
    'acil_started_at', v_campaign_start,
    'acil_pack_days', v_new_pack_days,
    'amount_kurus', v_amount,
    'stacked', v_active
  );
end;
$$;

grant execute on function public.register_acil_purchase(uuid, uuid, text, text, integer, integer)
  to service_role;

-- 7) admin: feature_boost temizle (yanlış hediye geri alma)
create or replace function public.admin_clear_listing_feature_boost(
  p_listing_number bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.listings
  where listing_number = p_listing_number
  limit 1;

  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  perform set_config('app.featured_until_internal', 'on', true);

  update public.listings
  set
    featured_until = null,
    featured_started_at = null,
    feature_boost_campaign_start_at = null,
    feature_boost_pack_days = null
  where id = v_id;

  return jsonb_build_object('ok', true, 'listing_number', p_listing_number);
end;
$$;

grant execute on function public.admin_clear_listing_feature_boost(bigint)
  to service_role;

-- 8) admin: acil hediye (listing_number + gün)
create or replace function public.admin_gift_listing_acil(
  p_listing_number bigint,
  p_days integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings%rowtype;
  v_product text;
  v_tx text;
begin
  if p_days not in (5, 15) then
    return jsonb_build_object('ok', false, 'error', 'invalid_days');
  end if;

  v_product := case p_days when 5 then 'acil_5d' else 'acil_15d' end;

  select * into v_listing
  from public.listings
  where listing_number = p_listing_number
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  v_tx := 'gift_acil_' || p_listing_number::text || '_' || p_days::text || '_' ||
    to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');

  return public.register_acil_purchase(
    v_listing.user_id,
    v_listing.id,
    v_product,
    v_tx,
    p_days,
    case p_days when 5 then 28900 else 62000 end
  );
end;
$$;

grant execute on function public.admin_gift_listing_acil(bigint, integer)
  to service_role;
