-- Supabase SQL Editor’da bir kez çalıştırın.
-- Admin hesapları: auth.users ile eşleşen kullanıcılar + görünen ad + doğrulama rozeti için kaynak.

-- Eski şema: PK "id" ise "user_id" olacak şekilde yeniden adlandır (yeniden çalıştırmada güvenli).
DO $fix_admin$
BEGIN
  IF to_regclass('public.admin_profiles') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'admin_profiles' AND column_name = 'id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'admin_profiles' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.admin_profiles RENAME COLUMN id TO user_id;
    END IF;
  END IF;
END
$fix_admin$;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default 'Oto Support',
  created_at timestamptz not null default now()
);

create unique index if not exists admin_profiles_email_lower_idx
  on public.admin_profiles (lower(email));

alter table public.admin_profiles enable row level security;

drop policy if exists "admin_profiles_select_public" on public.admin_profiles;
create policy "admin_profiles_select_public"
  on public.admin_profiles
  for select
  to anon, authenticated
  using (true);

grant select on public.admin_profiles to anon, authenticated;

-- Yeni kayıt: seed e-postası otomatik admin olur.
create or replace function public.promote_seed_admin_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'skeklik098@gmail.com' then
    insert into public.admin_profiles (user_id, email, display_name)
    values (new.id, lower(new.email), 'Oto Support')
    on conflict (user_id) do update
      set email = excluded.email,
          display_name = excluded.display_name;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_admin_profile on auth.users;
create trigger on_auth_user_created_admin_profile
  after insert on auth.users
  for each row
  execute procedure public.promote_seed_admin_on_signup();

-- Zaten kayıtlı kullanıcı varsa tek seferlik eşleştirme.
insert into public.admin_profiles (user_id, email, display_name)
select id, lower(email), 'Oto Support'
from auth.users
where lower(email) = 'skeklik098@gmail.com'
on conflict (user_id) do update
  set email = excluded.email,
      display_name = excluded.display_name;
