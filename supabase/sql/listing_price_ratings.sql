-- Fiyat oyları (mobil uygulama ile aynı tablo)
-- rating: 1 = makul, 2 = biraz pahalı, 3 = fahiş

-- Web’de ortalama rengi göstermek için herkesin oy satırlarını okuyabilmesi gerekir.
-- (Yalnızca listing_id, rating, user_id — kişisel veri yok.)
alter table public.listing_price_ratings enable row level security;

drop policy if exists listing_price_ratings_select_public on public.listing_price_ratings;
create policy listing_price_ratings_select_public
  on public.listing_price_ratings
  for select
  to anon, authenticated
  using (true);

-- Oy verme: giriş yapmış, kendi user_id’si ile insert/update
drop policy if exists listing_price_ratings_insert_own on public.listing_price_ratings;
create policy listing_price_ratings_insert_own
  on public.listing_price_ratings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists listing_price_ratings_update_own on public.listing_price_ratings;
create policy listing_price_ratings_update_own
  on public.listing_price_ratings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
