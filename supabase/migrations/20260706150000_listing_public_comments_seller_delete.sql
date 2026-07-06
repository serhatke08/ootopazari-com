-- İlan sahibi kendi ilanındaki herkese açık yorumları silebilir.

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
