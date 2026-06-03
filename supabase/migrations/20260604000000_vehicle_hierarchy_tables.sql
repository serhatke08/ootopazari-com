-- Vehicle hierarchy tables for car classification
-- Model → Kasa → Motor → Paket structure

-- 1. Vehicle Brand Models (Seri/Model)
CREATE TABLE IF NOT EXISTS vehicle_brand_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES vehicle_brands(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES vehicle_brand_models(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_brand_models_brand_id ON vehicle_brand_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_brand_models_parent_id ON vehicle_brand_models(parent_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_brand_models_sort_order ON vehicle_brand_models(sort_order);

ALTER TABLE vehicle_brand_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view vehicle_brand_models"
  ON vehicle_brand_models
  FOR SELECT
  USING (TRUE);

-- 2. Vehicle Model Body Styles (Kasa Tipi)
CREATE TABLE IF NOT EXISTS vehicle_model_body_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES vehicle_brand_models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_model_body_styles_model_id ON vehicle_model_body_styles(model_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_model_body_styles_sort_order ON vehicle_model_body_styles(sort_order);

ALTER TABLE vehicle_model_body_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view vehicle_model_body_styles"
  ON vehicle_model_body_styles
  FOR SELECT
  USING (TRUE);

-- 3. Vehicle Body Style Engines (Motor)
CREATE TABLE IF NOT EXISTS vehicle_body_style_engines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body_style_id UUID NOT NULL REFERENCES vehicle_model_body_styles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  fuel_type TEXT,
  horsepower INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_body_style_engines_body_style_id ON vehicle_body_style_engines(body_style_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_body_style_engines_sort_order ON vehicle_body_style_engines(sort_order);

ALTER TABLE vehicle_body_style_engines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view vehicle_body_style_engines"
  ON vehicle_body_style_engines
  FOR SELECT
  USING (TRUE);

-- 4. Vehicle Engine Packages (Paket)
CREATE TABLE IF NOT EXISTS vehicle_engine_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_id UUID NOT NULL REFERENCES vehicle_body_style_engines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_engine_packages_engine_id ON vehicle_engine_packages(engine_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_engine_packages_sort_order ON vehicle_engine_packages(sort_order);

ALTER TABLE vehicle_engine_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view vehicle_engine_packages"
  ON vehicle_engine_packages
  FOR SELECT
  USING (TRUE);

-- 5. User Notifications Table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read_at ON user_notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON user_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicle_brand_models_updated_at
  BEFORE UPDATE ON vehicle_brand_models
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_model_body_styles_updated_at
  BEFORE UPDATE ON vehicle_model_body_styles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_body_style_engines_updated_at
  BEFORE UPDATE ON vehicle_body_style_engines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_engine_packages_updated_at
  BEFORE UPDATE ON vehicle_engine_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
