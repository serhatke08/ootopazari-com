-- Bildirim okundu durumu: is_read + read_at senkron; RLS recipient_id|user_id

-- 1) Eksik user_id doldur
UPDATE public.user_notifications
SET user_id = recipient_id
WHERE user_id IS NULL
  AND recipient_id IS NOT NULL;

-- 2) Çift alan senkronu
UPDATE public.user_notifications
SET is_read = true
WHERE read_at IS NOT NULL
  AND is_read IS DISTINCT FROM true;

UPDATE public.user_notifications
SET read_at = COALESCE(read_at, created_at, now())
WHERE is_read = true
  AND read_at IS NULL;

-- 3) RLS: sahip = user_id veya recipient_id
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS user_notifications_select_own ON public.user_notifications;
DROP POLICY IF EXISTS user_notifications_update_own ON public.user_notifications;
DROP POLICY IF EXISTS user_notifications_delete_own ON public.user_notifications;

CREATE POLICY user_notifications_select_own
  ON public.user_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = recipient_id);

CREATE POLICY user_notifications_update_own
  ON public.user_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = recipient_id);

CREATE POLICY user_notifications_delete_own
  ON public.user_notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = recipient_id);
