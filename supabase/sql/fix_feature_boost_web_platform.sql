-- Öne çıkarma web ödemeleri için platform kısıtı (PayTR RPC çalışması için zorunlu)
-- Supabase SQL Editor'da çalıştırın, ardından başarı sayfasını yenileyin.

ALTER TABLE feature_boost_iap_purchases
  DROP CONSTRAINT IF EXISTS feature_boost_iap_purchases_platform_check;

ALTER TABLE feature_boost_iap_purchases
  ADD CONSTRAINT feature_boost_iap_purchases_platform_check
  CHECK (platform IN ('ios', 'android', 'web', 'admin'));
