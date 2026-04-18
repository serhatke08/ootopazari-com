-- Supabase SQL Editor’da bir kez çalıştırın.
-- Hata: "violates check constraint listings_moderation_status_check"
-- Askıya alma için moderation_status = 'suspended' izin verilmeli.

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
      'suspended'
    )
  );

comment on constraint listings_moderation_status_check on public.listings is
  'pending | approved | rejected | suspended (askıda yayından düşer)';
