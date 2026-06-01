-- Referans: Supabase'de mevcut tablo (mobil ile paylaşımlı).
-- Web şikayet: POST /api/listings/report → listing_reports insert.

-- listing_id uuid → listings(id)
-- reporter_id uuid → auth.users(id)
-- reason text (ör. Yanıltıcı bilgi, Yanlış kategori, Spam, …)
-- detail text null
-- status text (ör. pending)
-- unique_report_per_user_listing (listing_id, reporter_id)

-- RLS: oturum açmış kullanıcı kendi reporter_id ile insert edebilmeli.
