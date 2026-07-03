-- Destek sohbeti: kullanıcı <-> admin (admin_profiles)
-- Supabase SQL Editor'da bir kez çalıştırın.

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists support_threads_updated_at_idx
  on public.support_threads (updated_at desc);

create index if not exists support_messages_thread_id_created_at_idx
  on public.support_messages (thread_id, created_at asc);

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
  );
$$;

create or replace function public.touch_support_thread_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_threads
  set updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists support_messages_touch_thread on public.support_messages;
create trigger support_messages_touch_thread
  after insert on public.support_messages
  for each row
  execute procedure public.touch_support_thread_updated_at();

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "support_threads_select_own_or_admin" on public.support_threads;
create policy "support_threads_select_own_or_admin"
  on public.support_threads
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin_user());

drop policy if exists "support_threads_insert_own" on public.support_threads;
create policy "support_threads_insert_own"
  on public.support_threads
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "support_messages_select_own_or_admin" on public.support_messages;
create policy "support_messages_select_own_or_admin"
  on public.support_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.support_threads t
      where t.id = thread_id
        and (t.user_id = auth.uid() or public.is_admin_user())
    )
  );

drop policy if exists "support_messages_insert_participant" on public.support_messages;
create policy "support_messages_insert_participant"
  on public.support_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.support_threads t
      where t.id = thread_id
        and (
          t.user_id = auth.uid()
          or public.is_admin_user()
        )
    )
  );

grant select, insert on public.support_threads to authenticated;
grant select, insert on public.support_messages to authenticated;
