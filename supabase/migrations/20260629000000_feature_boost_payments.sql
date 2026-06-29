-- PayTR öne çıkarma ödemeleri (bildirim URL tekrarları için idempotency)
CREATE TABLE IF NOT EXISTS feature_boost_payments (
  merchant_oid TEXT PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  pack_days INTEGER NOT NULL CHECK (pack_days > 0),
  amount_kurus INTEGER NOT NULL CHECK (amount_kurus > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  paytr_status TEXT,
  total_amount_kurus INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS feature_boost_payments_listing_id_idx
  ON feature_boost_payments (listing_id);

ALTER TABLE feature_boost_payments ENABLE ROW LEVEL SECURITY;
