-- Supabase SQL Editor’da bir kez çalıştırın.
-- admin_profiles e-postasını anon/authenticated SELECT’ten çıkarır.
-- Rozet için user_id + display_name yeter.

revoke select on public.admin_profiles from anon, authenticated;
grant select (user_id, display_name, created_at) on public.admin_profiles to anon, authenticated;
