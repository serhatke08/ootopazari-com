-- Bayi (Dealer) sistem tabloları

-- 1. bayi_applications tablosu (başvurular)
CREATE TABLE IF NOT EXISTS bayi_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_type TEXT NOT NULL CHECK (dealer_type IN ('galeri', 'parcaci', 'kiralama', 'expertiz')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  city_id TEXT REFERENCES cities(id),
  dealer_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'awaiting_payment', 'paid', 'overdue')),
  monthly_fee_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_paid_at TIMESTAMPTZ,
  membership_starts_at TIMESTAMPTZ,
  membership_expires_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workplace_photos_json TEXT,
  signboard_photo_storage_path TEXT,
  UNIQUE(user_id, dealer_type)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_bayi_applications_user_id ON bayi_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_bayi_applications_dealer_type ON bayi_applications(dealer_type);
CREATE INDEX IF NOT EXISTS idx_bayi_applications_status ON bayi_applications(status);

-- RLS Policies
ALTER TABLE bayi_applications ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi başvurularını görebilir
CREATE POLICY "Users can view own applications"
  ON bayi_applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Kullanıcı kendi başvurusunu oluşturabilir
CREATE POLICY "Users can create own applications"
  ON bayi_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. Galeri Dealers
CREATE TABLE IF NOT EXISTS galeri_dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_name TEXT NOT NULL,
  contact_phone TEXT,
  description TEXT,
  city_id TEXT REFERENCES cities(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galeri_dealers_user_id ON galeri_dealers(user_id);
CREATE INDEX IF NOT EXISTS idx_galeri_dealers_city_id ON galeri_dealers(city_id);
CREATE INDEX IF NOT EXISTS idx_galeri_dealers_is_active ON galeri_dealers(is_active);

ALTER TABLE galeri_dealers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active galeri dealers"
  ON galeri_dealers
  FOR SELECT
  USING (is_active = TRUE);

-- 3. Expertiz Dealers
CREATE TABLE IF NOT EXISTS expertiz_dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_name TEXT NOT NULL,
  contact_phone TEXT,
  description TEXT,
  city_id TEXT REFERENCES cities(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  approved_at TIMESTAMPTZ,
  price_list JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expertiz_dealers_user_id ON expertiz_dealers(user_id);
CREATE INDEX IF NOT EXISTS idx_expertiz_dealers_city_id ON expertiz_dealers(city_id);
CREATE INDEX IF NOT EXISTS idx_expertiz_dealers_is_active ON expertiz_dealers(is_active);

ALTER TABLE expertiz_dealers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active expertiz dealers"
  ON expertiz_dealers
  FOR SELECT
  USING (is_active = TRUE);

-- 4. Kiralama Dealers
CREATE TABLE IF NOT EXISTS kiralama_dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_name TEXT NOT NULL,
  contact_phone TEXT,
  description TEXT,
  city_id TEXT REFERENCES cities(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kiralama_dealers_user_id ON kiralama_dealers(user_id);
CREATE INDEX IF NOT EXISTS idx_kiralama_dealers_city_id ON kiralama_dealers(city_id);
CREATE INDEX IF NOT EXISTS idx_kiralama_dealers_is_active ON kiralama_dealers(is_active);

ALTER TABLE kiralama_dealers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active kiralama dealers"
  ON kiralama_dealers
  FOR SELECT
  USING (is_active = TRUE);

-- 5. Parcaci Dealers
CREATE TABLE IF NOT EXISTS parcaci_dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_name TEXT NOT NULL,
  contact_phone TEXT,
  description TEXT,
  city_id TEXT REFERENCES cities(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcaci_dealers_user_id ON parcaci_dealers(user_id);
CREATE INDEX IF NOT EXISTS idx_parcaci_dealers_city_id ON parcaci_dealers(city_id);
CREATE INDEX IF NOT EXISTS idx_parcaci_dealers_is_active ON parcaci_dealers(is_active);

ALTER TABLE parcaci_dealers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active parcaci dealers"
  ON parcaci_dealers
  FOR SELECT
  USING (is_active = TRUE);

-- 6. Galeri Listings
CREATE TABLE IF NOT EXISTS galeri_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES galeri_dealers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(15, 2),
  image_url TEXT,
  city_id TEXT REFERENCES cities(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galeri_listings_dealer_id ON galeri_listings(dealer_id);
CREATE INDEX IF NOT EXISTS idx_galeri_listings_user_id ON galeri_listings(user_id);

ALTER TABLE galeri_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view galeri listings"
  ON galeri_listings
  FOR SELECT
  USING (TRUE);

-- 7. Expertiz Listings
CREATE TABLE IF NOT EXISTS expertiz_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES expertiz_dealers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(15, 2),
  image_url TEXT,
  city_id TEXT REFERENCES cities(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expertiz_listings_dealer_id ON expertiz_listings(dealer_id);
CREATE INDEX IF NOT EXISTS idx_expertiz_listings_user_id ON expertiz_listings(user_id);

ALTER TABLE expertiz_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view expertiz listings"
  ON expertiz_listings
  FOR SELECT
  USING (TRUE);

-- 8. Kiralama Listings
CREATE TABLE IF NOT EXISTS kiralik_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES kiralama_dealers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(15, 2),
  image_url TEXT,
  city_id TEXT REFERENCES cities(id),
  rental_available BOOLEAN DEFAULT TRUE,
  rental_vehicle_status TEXT CHECK (rental_vehicle_status IN ('available', 'rented', 'service', 'unavailable')),
  rental_weekly_price DECIMAL(15, 2),
  rental_monthly_price DECIMAL(15, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kiralik_listings_dealer_id ON kiralik_listings(dealer_id);
CREATE INDEX IF NOT EXISTS idx_kiralik_listings_user_id ON kiralik_listings(user_id);

ALTER TABLE kiralik_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view kiralik listings"
  ON kiralik_listings
  FOR SELECT
  USING (TRUE);

-- 9. Parcaci Listings
CREATE TABLE IF NOT EXISTS parcaci_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES parcaci_dealers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(15, 2),
  image_url TEXT,
  city_id TEXT REFERENCES cities(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcaci_listings_dealer_id ON parcaci_listings(dealer_id);
CREATE INDEX IF NOT EXISTS idx_parcaci_listings_user_id ON parcaci_listings(user_id);

ALTER TABLE parcaci_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view parcaci listings"
  ON parcaci_listings
  FOR SELECT
  USING (TRUE);

-- Test verisi ekle (geliştirme için)
-- Örnek expertiz dealer
INSERT INTO expertiz_dealers (
  id,
  user_id,
  dealer_name,
  contact_phone,
  description,
  city_id,
  is_active,
  approved_at,
  price_list
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'Pro Ekspertiz',
  '0555 123 45 67',
  'Profesyonel araç ekspertiz hizmeti. 15 yıllık tecrübe.',
  (SELECT id FROM cities WHERE name = 'İstanbul' LIMIT 1),
  TRUE,
  NOW(),
  '[
    {"service": "Tam Ekspertiz", "price": 1500, "description": "Komple araç kontrolü"},
    {"service": "Motor Kontrolü", "price": 800, "description": "Motor ve şanzıman kontrolü"},
    {"service": "Kaporta Kontrolü", "price": 600, "description": "Boya ve hasar kontrolü"},
    {"service": "Alışveriş Danışmanlığı", "price": 500, "description": "Araç satın alma öncesi danışmanlık"}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Örnek galeri dealer
INSERT INTO galeri_dealers (
  id,
  user_id,
  dealer_name,
  contact_phone,
  description,
  city_id,
  is_active,
  approved_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'Mega Oto Galeri',
  '0532 987 65 43',
  'İkinci el araç alım satım. Geniş stok, uygun fiyatlar.',
  (SELECT id FROM cities WHERE name = 'Ankara' LIMIT 1),
  TRUE,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Örnek kiralama dealer
INSERT INTO kiralama_dealers (
  id,
  user_id,
  dealer_name,
  contact_phone,
  description,
  city_id,
  is_active,
  approved_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'Rent A Car Plus',
  '0542 111 22 33',
  'Günlük ve aylık araç kiralama hizmeti. Havalimanı teslim.',
  (SELECT id FROM cities WHERE name = 'İzmir' LIMIT 1),
  TRUE,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Örnek parcaci dealer
INSERT INTO parcaci_dealers (
  id,
  user_id,
  dealer_name,
  contact_phone,
  description,
  city_id,
  is_active,
  approved_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'Oto Parça Merkezi',
  '0555 444 33 22',
  'Her marka araç için orjinal ve yan sanayi yedek parça.',
  (SELECT id FROM cities WHERE name = 'Bursa' LIMIT 1),
  TRUE,
  NOW()
)
ON CONFLICT DO NOTHING;
