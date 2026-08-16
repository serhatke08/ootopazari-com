-- Supabase SQL Editor’da bir kez çalıştırın.
-- Önceki sürüm e-postayı herkesten (admin dahil) kesiyordu; bu onu düzeltir.
-- Anon: sadece rozet (user_id, display_name). Admin oturumu: tam satır.

revoke select on public.admin_profiles from anon, authenticated;
grant select (user_id, display_name, created_at) on public.admin_profiles to anon;
grant select on public.admin_profiles to authenticated;
