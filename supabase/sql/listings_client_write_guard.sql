-- Supabase SQL Editor’da bir kez çalıştırın.
-- İlan akışını değiştirmez: yayın hâlâ anında approved.
-- Tarayıcıdan öne çıkar / askı kaldırma / user_id değişmez.
-- PayTR, cron, askıya alma service_role ile çalışmaya devam eder.

create or replace function public.listings_guard_client_privilege_fields()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.featured_until := null;
    new.featured_started_at := null;
    new.feature_boost_campaign_start_at := null;
    new.feature_boost_pack_days := null;
    new.suspended_at := null;
    new.suspension_reason := null;
    if new.moderation_status is null
       or lower(new.moderation_status) not in ('approved', 'pending') then
      new.moderation_status := 'approved';
    end if;
  elsif tg_op = 'UPDATE' then
    new.featured_until := old.featured_until;
    new.featured_started_at := old.featured_started_at;
    new.feature_boost_campaign_start_at := old.feature_boost_campaign_start_at;
    new.feature_boost_pack_days := old.feature_boost_pack_days;
    new.user_id := old.user_id;
    new.listing_number := old.listing_number;
    if lower(coalesce(old.moderation_status, '')) = 'suspended' then
      new.moderation_status := old.moderation_status;
      new.suspension_reason := old.suspension_reason;
      new.suspended_at := old.suspended_at;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists listings_guard_client_privilege_fields on public.listings;
create trigger listings_guard_client_privilege_fields
  before insert or update on public.listings
  for each row
  execute procedure public.listings_guard_client_privilege_fields();
