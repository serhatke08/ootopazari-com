-- EİDS (Elektronik İlan Doğrulama Sistemi) doğrulama oturumları.
-- Return URL callback’te state ile kaynak (app|web) eşlemesi için.

create table if not exists public.eids_verification_sessions (
  id uuid primary key default gen_random_uuid(),
  state text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid null references public.listings (id) on delete set null,
  source text not null check (source in ('app', 'web')),
  web_return_path text null,
  yetki_kodu text null,
  durum text null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'expired', 'consumed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  callback_at timestamptz null,
  callback_query jsonb null
);

create index if not exists eids_verification_sessions_user_pending_idx
  on public.eids_verification_sessions (user_id, created_at desc)
  where status = 'pending';

create index if not exists eids_verification_sessions_yetki_idx
  on public.eids_verification_sessions (yetki_kodu)
  where yetki_kodu is not null;

create index if not exists eids_verification_sessions_expires_idx
  on public.eids_verification_sessions (expires_at)
  where status = 'pending';

alter table public.eids_verification_sessions enable row level security;

-- Kullanıcı yalnızca kendi oturumunu okuyabilir (yazma service role / API).
drop policy if exists "eids sessions select own" on public.eids_verification_sessions;
create policy "eids sessions select own"
  on public.eids_verification_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.eids_verification_sessions from public;
grant select on table public.eids_verification_sessions to authenticated;
grant all on table public.eids_verification_sessions to service_role;
