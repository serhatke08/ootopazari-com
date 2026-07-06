-- İlan detayında herkese açık soru / yorum paneli (özel mesajlardan bağımsız)
-- Supabase SQL Editor'da bu dosyanın tamamını çalıştırın.

CREATE TABLE IF NOT EXISTS listing_public_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_public_comments_listing_id
  ON listing_public_comments(listing_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_listing_public_comments_user_id
  ON listing_public_comments(user_id);

ALTER TABLE listing_public_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read listing comments" ON listing_public_comments;
CREATE POLICY "Public can read listing comments"
  ON listing_public_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM listings l
      WHERE l.id = listing_id
        AND (
          l.moderation_status = 'approved'
          OR l.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can post listing comments" ON listing_public_comments;
CREATE POLICY "Authenticated users can post listing comments"
  ON listing_public_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM listings l
      WHERE l.id = listing_id
        AND l.moderation_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can delete own listing comments" ON listing_public_comments;
CREATE POLICY "Users can delete own listing comments"
  ON listing_public_comments
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Listing owner can delete listing comments" ON listing_public_comments;
CREATE POLICY "Listing owner can delete listing comments"
  ON listing_public_comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM listings l
      WHERE l.id = listing_id
        AND l.user_id = auth.uid()
    )
  );
