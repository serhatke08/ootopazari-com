-- Taslak JSON + görseller için private storage bucket
insert into storage.buckets (id, name, public, file_size_limit)
values ('listing-drafts', 'listing-drafts', false, 15728640)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;
