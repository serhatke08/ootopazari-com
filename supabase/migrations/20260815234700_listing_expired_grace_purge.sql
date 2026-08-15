-- Pasif ilan 5 gün sonra kalıcı silinir. expired_at = pasife alınma anı.

alter table public.listings
  add column if not exists expired_at timestamptz;

update public.listings
set
  moderation_status = 'expired',
  expired_at = coalesce(expired_at, now()),
  suspension_reason = coalesce(
    nullif(suspension_reason, ''),
    'İlan süresi (30 gün) doldu.'
  )
where lower(coalesce(moderation_status, '')) = 'approved'
  and coalesce(activated_at, created_at, now()) < now() - interval '30 days';

update public.listings
set expired_at = coalesce(expired_at, now())
where lower(coalesce(moderation_status, '')) = 'expired'
  and expired_at is null;
