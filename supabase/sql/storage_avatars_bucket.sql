-- İsteğe bağlı: `avatars` bucket yoksa oluşturur; yükleme politikası örneği.
-- Dashboard → Storage ile de yapılabilir; mevcut bucket’ınız varsa atlayın.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Kimlik doğrulamış kullanıcı yalnızca `{auth.uid()}/...` altına yazsın
drop policy if exists "avatars insert own folder" on storage.objects;
create policy "avatars insert own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  );

drop policy if exists "avatars update own folder" on storage.objects;
create policy "avatars update own folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  );

drop policy if exists "avatars delete own folder" on storage.objects;
create policy "avatars delete own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  );

-- Herkes okuyabilsin (public bucket)
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select to public
  using (bucket_id = 'avatars');
