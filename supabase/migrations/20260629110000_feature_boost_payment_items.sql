-- Çoklu ilan öne çıkarma ödemesi (tek PayTR işlemi, birden fazla ilan)
CREATE TABLE IF NOT EXISTS feature_boost_payment_items (
  merchant_oid TEXT NOT NULL REFERENCES feature_boost_payments (merchant_oid) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  listing_number TEXT NOT NULL,
  pack_days INTEGER NOT NULL CHECK (pack_days > 0),
  PRIMARY KEY (merchant_oid, listing_id)
);

CREATE INDEX IF NOT EXISTS feature_boost_payment_items_listing_id_idx
  ON feature_boost_payment_items (listing_id);

ALTER TABLE feature_boost_payment_items ENABLE ROW LEVEL SECURITY;
