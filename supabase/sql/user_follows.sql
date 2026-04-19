-- Kullanıcı takibi (takipçi / takip sayıları için)
create table if not exists public.user_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

create index if not exists user_follows_following_id_idx
  on public.user_follows (following_id);

create index if not exists user_follows_follower_id_idx
  on public.user_follows (follower_id);

alter table public.user_follows enable row level security;

-- Sayılar herkese açık (ilan sitesi profili); ekleme/silme yalnızca oturumlu.
create policy "user_follows_select_public"
  on public.user_follows for select
  using (true);

create policy "user_follows_insert_own"
  on public.user_follows for insert
  to authenticated
  with check (follower_id = (select auth.uid()));

create policy "user_follows_delete_own"
  on public.user_follows for delete
  to authenticated
  using (follower_id = (select auth.uid()));
