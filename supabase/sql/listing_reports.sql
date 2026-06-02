-- İlan şikayet konu başlıkları (web + mobil ortak)
-- Web: POST /api/listings/report → listing_reports insert

-- Eski reason check kısıtını kaldır (adı projeden projeye değişebilir)
do $$
declare
  c record;
begin
  for c in
    select con.conname as name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'listing_reports'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%reason%'
  loop
    execute format(
      'alter table public.listing_reports drop constraint if exists %I',
      c.name
    );
  end loop;
end $$;

-- Eski kayıtları yeni konu başlıklarına taşı
update public.listing_reports
set reason = case reason
  when 'Yanıltıcı bilgi' then 'Yanıltıcı fiyat veya bilgi'
  when 'Spam' then 'Sahte veya spam ilan'
  when 'Sahte ilan' then 'Sahte veya spam ilan'
  when 'Fiyat / dolandırıcılık şüphesi' then 'Dolandırıcılık'
  else reason
end
where reason in (
  'Yanıltıcı bilgi',
  'Spam',
  'Sahte ilan',
  'Fiyat / dolandırıcılık şüphesi'
);

-- Güncel konu başlıkları
alter table public.listing_reports
  add constraint listing_reports_reason_check
  check (
    reason in (
      'Dolandırıcılık',
      'Yanlış kategori',
      'Eksik açıklama',
      'Expertiz yanlış, yok veya yüklenmemiş',
      'Yanıltıcı fiyat veya bilgi',
      'Sahte veya spam ilan',
      'Uygunsuz içerik',
      'Diğer'
    )
  );

-- RLS: oturum açmış kullanıcı kendi reporter_id ile insert edebilmeli.
alter table public.listing_reports enable row level security;

drop policy if exists listing_reports_insert_own on public.listing_reports;
create policy listing_reports_insert_own
  on public.listing_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);
