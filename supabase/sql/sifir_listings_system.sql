-- Sıfır araçlar vitrini (acil ve öne çıkarma / feature_boost'tan bağımsız).
-- Ana sayfa satırı henüz yok; /sifir-araclar sayfası için hazır.
-- Paket günleri: 7 / 30 (fiyatlar sonra netleşecek; register içinde kuruş tutulur).

-- 1) listings sıfır alanları
alter table public.listings
  add column if not exists sifir_until timestamptz,
  add column if not exists sifir_started_at timestamptz,
  add column if not exists sifir_pack_days integer;

create index if not exists listings_sifir_until_live_idx
  on public.listings (sifir_until desc)
  where sifir_until is not null;

comment on column public.listings.sifir_until is
  'Sıfır araçlar vitrin bitişi; /sifir-araclar (ana sayfa satırı sonra eklenecek)';
comment on column public.listings.sifir_pack_days is
  'Aktif sıfır vitrin paket günü (7 veya 30)';

-- 2) satın alma / hediye kayıtları
create table if not exists public.sifir_purchases (
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

create index if not exists sifir_purchases_listing_id_idx
  on public.sifir_purchases (listing_id);

create index if not exists sifir_purchases_user_id_idx
  on public.sifir_purchases (user_id);

alter table public.sifir_purchases enable row level security;

-- 3) ödeme siparişleri (PayTR — ileride checkout)
create table if not exists public.sifir_payments (
  merchant_oid text primary key,
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null,
  pack_days integer not null check (pack_days in (7, 30)),
  amount_kurus integer not null check (amount_kurus > 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed')),
  paytr_status text,
  total_amount_kurus integer,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists sifir_payments_listing_id_idx
  on public.sifir_payments (listing_id);

alter table public.sifir_payments enable row level security;

-- 4) alan koruma (yalnızca internal flag ile yazılır)
create or replace function public.listings_guard_sifir_fields()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.sifir_internal', true) = 'on' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.sifir_until is distinct from old.sifir_until
      or new.sifir_started_at is distinct from old.sifir_started_at
      or new.sifir_pack_days is distinct from old.sifir_pack_days
    then
      raise exception 'sifir fields can only be set via register_sifir_purchase';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists listings_guard_sifir_fields_trg on public.listings;
create trigger listings_guard_sifir_fields_trg
  before update of sifir_until, sifir_started_at, sifir_pack_days
  on public.listings
  for each row
  execute function public.listings_guard_sifir_fields();

-- 5) register / stack sıfır vitrin
create or replace function public.register_sifir_purchase(
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
  v_existing public.sifir_purchases%rowtype;
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
    when 'sifir_7d' then 7
    when 'sifir_30d' then 30
    else null
  end;

  -- Geçici fiyatlar; checkout eklenince güncellenir
  v_amount := case p_product_id
    when 'sifir_7d' then 39900
    when 'sifir_30d' then 99900
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
  from public.sifir_purchases
  where platform = 'web'
    and transaction_id = p_transaction_id
  limit 1;

  if found then
    select sifir_until, sifir_pack_days
      into v_until, v_pack_days
    from public.listings
    where id = p_listing_id;

    return jsonb_build_object(
      'ok', true,
      'already_applied', true,
      'listing_id', p_listing_id,
      'purchase_id', v_existing.id,
      'sifir_until', v_until,
      'sifir_pack_days', v_pack_days
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

  v_active := v_listing.sifir_until is not null
    and v_listing.sifir_until > v_started;

  if v_active then
    v_campaign_start := coalesce(v_listing.sifir_started_at, v_started);
    v_new_pack_days := coalesce(v_listing.sifir_pack_days, 0) + p_days;
    v_until := v_campaign_start + make_interval(days => v_new_pack_days);
  else
    v_campaign_start := v_started;
    v_new_pack_days := p_days;
    v_until := v_started + make_interval(days => p_days);
  end if;

  perform set_config('app.sifir_internal', 'on', true);

  update public.listings
  set
    sifir_started_at = case
      when v_active then coalesce(v_listing.sifir_started_at, v_campaign_start)
      else v_started
    end,
    sifir_pack_days = v_new_pack_days,
    sifir_until = v_until
  where id = p_listing_id;

  insert into public.sifir_purchases (
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
    'sifir_until', v_until,
    'sifir_started_at', v_campaign_start,
    'sifir_pack_days', v_new_pack_days,
    'amount_kurus', v_amount,
    'stacked', v_active
  );
end;
$$;

grant execute on function public.register_sifir_purchase(uuid, uuid, text, text, integer, integer)
  to service_role;

-- 6) admin: sıfır vitrin hediye (listing_number + gün)
create or replace function public.admin_gift_listing_sifir(
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
  if p_days not in (7, 30) then
    return jsonb_build_object('ok', false, 'error', 'invalid_days');
  end if;

  v_product := case p_days when 7 then 'sifir_7d' else 'sifir_30d' end;

  select * into v_listing
  from public.listings
  where listing_number = p_listing_number
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  v_tx := 'gift_sifir_' || p_listing_number::text || '_' || p_days::text || '_' ||
    to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');

  return public.register_sifir_purchase(
    v_listing.user_id,
    v_listing.id,
    v_product,
    v_tx,
    p_days,
    case p_days when 7 then 39900 else 99900 end
  );
end;
$$;

grant execute on function public.admin_gift_listing_sifir(bigint, integer)
  to service_role;
