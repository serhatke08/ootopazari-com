-- Bayi aylık üyelik ödemeleri (PayTR) + kullanıcı ödeme geçmişi RLS

CREATE TABLE IF NOT EXISTS bayi_membership_payments (
  merchant_oid TEXT PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES bayi_applications (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  dealer_type TEXT NOT NULL CHECK (dealer_type IN ('galeri', 'parcaci', 'kiralama', 'expertiz')),
  amount_kurus INTEGER NOT NULL CHECK (amount_kurus > 0),
  membership_days INTEGER NOT NULL DEFAULT 30 CHECK (membership_days > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  paytr_status TEXT,
  total_amount_kurus INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS bayi_membership_payments_user_id_idx
  ON bayi_membership_payments (user_id);

CREATE INDEX IF NOT EXISTS bayi_membership_payments_application_id_idx
  ON bayi_membership_payments (application_id);

ALTER TABLE bayi_membership_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bayi membership payments"
  ON bayi_membership_payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Öne çıkarma ödemeleri — kullanıcı kendi geçmişini görebilir
CREATE POLICY "Users can view own feature boost payments"
  ON feature_boost_payments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own feature boost payment items"
  ON feature_boost_payment_items
  FOR SELECT
  USING (
    merchant_oid IN (
      SELECT merchant_oid FROM feature_boost_payments WHERE user_id = auth.uid()
    )
  );
