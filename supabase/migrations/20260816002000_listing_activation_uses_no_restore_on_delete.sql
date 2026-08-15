-- İlan silinince ücretsiz hak geri gelmesin: listings FK cascade varsa kaldır.

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'listing_activation_uses'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike '%listings%'
  loop
    execute format(
      'alter table public.listing_activation_uses drop constraint if exists %I',
      r.conname
    );
  end loop;
end $$;

drop policy if exists listing_activation_uses_update_own on public.listing_activation_uses;
drop policy if exists listing_activation_uses_delete_own on public.listing_activation_uses;

revoke update, delete on public.listing_activation_uses from anon, authenticated;
