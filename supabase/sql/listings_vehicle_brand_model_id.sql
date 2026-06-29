-- Supabase SQL Editor'da çalıştırın (yeni ilanlarda Seri FK için).
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS vehicle_brand_model_id UUID
  REFERENCES vehicle_brand_models(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_listings_vehicle_brand_model_id
  ON listings(vehicle_brand_model_id);
