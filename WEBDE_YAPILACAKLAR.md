# Webde sonra yapılacaklar

Uygulamada yapıldı. Web henüz yapılmadı. Bu dosya kontrol listesi. Acil ilan sistemi duruyor; sadece bayi şeridindeki Acil kısayolu kalktı.

Uygulama tarafındaki SQL henüz veritabanına basılmadıysa web de başvuru kaydedemez:

`otopazar/supabase/migrations/20261106040000_extra_dealer_types.sql`

Bu dosya şunları açar:

- `bayi_applications.dealer_type` kontrolü
- `dealer_membership_iap_purchases.dealer_type` kontrolü
- `enforce_dealer_listing_scope` tetikleyicisi

Yeni kodlar: `servis`, `kaporta`, `lastik`, `cekici`, `oto_elektrik`, `aksesuar`, `yikama`, `sigorta`.

Eski kodlar duruyor: `galeri`, `expertiz`, `kiralama`, `parcaci`.

## Ne değişti (uygulama)

Ana sayfa bayi şeridi, soldan sağa:

1. Kategoriler
2. Galeri
3. Expertiz
4. Yedek Parça
5. Kiralama
6. Servis
7. Kaporta ve Boya
8. Lastik
9. Çekici
10. Oto Elektrik
11. Aksesuar
12. Yıkama
13. Sigorta

Acil bu şeritte yok. Ana sayfadaki acil ilan şeridi ve `/acil` sayfası duruyor. Onları silme.

Yeni bayilerin ayrı logosu yok. Uygulama daire içinde renkli ikon kullanıyor. Ayrı `*_dealers` tablosu yok. Bayi listesi `bayi_applications` üzerinden, `dealer_type` + `status = approved` ile geliyor. İlanlar `listings.dealer_type_scope` ile tutuluyor.

Aylık ücret şimdilik 499,99 TL. Mağaza ürün kimliği yok. Uygulama içi ödeme bu sekiz tür için henüz açılmaz. Webde PayTR de yeni kodları tanımazsa ödeme düşer.

Splash ekranına bu sekiz bayi eklenmedi. Logoları yok.

## Webde değiştirilecek dosyalar

`src/lib/quick-access-links.ts`

- `Acil` satırını bu listeden çıkar. `/acil` sayfasını silme.
- `Parça` yazısını `Yedek Parça` yap. Adres `/parca` kalabilir.
- Sıra uygulamayla aynı olsun: Kategoriler (webde hâlâ “Pazar” yazıyor, uygulama “Kategoriler”), Galeri, Expertiz, Yedek Parça, Kiralama, sonra sekiz yeni bayi.
- Webde duran ve uygulamada bu şeritte olmayanlar: Sıfır Araçlar, İkinci El. Onlara dokunma, listenin sonunda kalsın.
- Yeni linkler: `/bayi/servis`, `/bayi/kaporta`, `/bayi/lastik`, `/bayi/cekici`, `/bayi/oto_elektrik`, `/bayi/aksesuar`, `/bayi/yikama`, `/bayi/sigorta`.
- Logo dosyası yok. İkon veya düz renk kullan. Uydurma png koyma.

`src/lib/bayi-types.ts`

- `DEALER_TYPES` dizisine sekiz kodu ekle.
- `DEALER_TYPE_LABELS`: Servis, Kaporta ve Boya, Lastik, Çekici, Oto Elektrik, Aksesuar, Yıkama, Sigorta.
- `parcaci` etiketi uygulamada artık “Yedek Parça”. Webde hâlâ “Parçacı”. Bunu da “Yedek Parça” yap.
- `DEALER_TYPE_DESCRIPTIONS` her yeni tür için kısa cümle.
- `DEALER_MONTHLY_FEES` her yeni tür için `499.99`.

`src/lib/dealer-types.ts`

- `DEALER_TYPE_VALUES` ve `DEALER_TYPE_META` aynı kodlar ve etiketler.
- `iconSrc` boş kalmasın. Logo yoksa mevcut bir ikonun yolunu geçici koy ve not düşün. Kırık resim bırakma.

`src/lib/bayi-paytr-oid.ts`

- `DEALER_OID_CODE` ve `OID_CODE_TO_DEALER` yeni türleri almazsa ödeme oid’si patlar.
- Mevcut kodlar: galeri 1, parcaci 2, kiralama 3, expertiz 4.
- Yenilere 5–12 ver. Eski numarayı değiştirme. Değiştirirsen eski ödemeler yanlış bayiye gider.

`src/app/api/bayi/application/route.ts`

- `DEALER_TYPES.includes` yeni kodu reddeder. Dizi güncellenince bu dosya kendiliğinden izin verir. Elle ek kod yazma, diziyi unutma.

`src/app/api/payments/bayi-membership/init/route.ts`

- Aynı dizi. Ücret `getMonthlyFeeForType` üzerinden gelir. Ücret haritası eksikse ödeme tutarı yanlış olur.

`src/app/bayi/basvuru/page.tsx`

- Tür listesi `DEALER_TYPES` ile çiziliyor. Yeni türler burada görünmeli.
- `parcaci` alt yazısı “Yedek parça satışı” olarak kalabilir. Başlık “Yedek Parça” olsun.

`src/app/bayilik-basvuru/page.tsx`

- `type` sorgu parametresi diziye bakıyor. Yeni türle açılınca boş sayfa olmamalı.

`src/app/bayi/[type]/page.tsx`
`src/app/bayi/[type]/[id]/page.tsx`
`src/app/bayi/panel/[type]/page.tsx`

- Üçü de `DEALER_TYPES.includes` ile 404 veriyor. Dizi güncellenmeden `/bayi/servis` açılmaz.

`src/lib/dealer-listing-tables.ts`

- Galeri ve parçacı ayrı tabloya bakıyor. Yeni türler `listings` ve `dealer_type_scope` kullanmalı. Yanlışlıkla `galeri_listings` sorgulanırsa o bayinin ilanları galeri ilanı gibi görünür.

`src/components/SiteHeader.tsx`

- Parçacı rozeti `dealer_type = parcaci` ile çekiliyor. Kodu değiştirme. Görünen yazı “Yedek Parça” olabilir.

`src/app/hakkimizda/page.tsx`

- Metin hâlâ “galeri, ekspertiz, kiralama ve parça”. Yeni türleri cümleye ekle. Zorunlu değil, metin eski kalmasın.

## Dokunulmayacaklar

- `/acil`, `/ilan-acil`, acil rozeti, acil vitrin sorguları, `ACIL_PACKS`.
- Expertiz şeması (`expertiz_panels`). Bu, ekspertiz bayisi değil, ilan ekspertiz çizimi.
- Kategori bölme işi (tır, çekici, ekskavatör listesi) bu notun konusu değil. O henüz yapılmadı.

## Kontrol

SQL basıldıktan sonra:

1. Ana şeritte Acil yok. Sekiz yeni başlık var. Yedek Parça yazısı “Parça” veya “Parçacı” değil.
2. `/bayi/servis` ve diğer yedi adres 404 vermiyor. Bayi yoksa boş liste, galeri bayileri değil.
3. Başvuru formunda sekiz tür seçiliyor. Kayıt `bayi_applications` tablosuna doğru `dealer_type` ile düşüyor. Veritabanı “check constraint” hatası vermiyor.
4. Onaysız kullanıcı ilanına `dealer_type_scope = servis` yazılırsa tetikleyici bunu null yapıyor. Onaylı servis bayisinde scope duruyor.
5. PayTR denemesinde oid `BM5M...` gibi yeni kodla üretiliyor ve geri dönüşte `servis` diye çözülüyor.
6. Eski galeri, kiralama, expertiz, parçacı başvurusu ve ödemesi bozulmuyor.
7. `/acil` hâlâ açılıyor.
8. Konsolda kırık resim veya “DEALER_TYPES” kaynaklı 404 yok.

Logo gelince şerit ikonlarını değiştir. O zamana kadar ikon veya düz renk yeter.

## Bayi haritası ve adres

Uygulama ana sayfanın sağ altında yüzen menü açıyor. İlk seçenek bayi haritası. Haritada ilan yok, sadece onaylı ve üyeliği süren bayi pinleri var.

İlk başvuru ekranı artık ön başvuru. Aylık ücret orada yok. Adres ve harita pini bu ekranda istenmiyor. Konum alanı tabloda duruyor; haritada görünmek için sonra mağaza ayarından girilecek. SQL henüz basılmadıysa harita fonksiyonu düşer:

`otopazar/supabase/migrations/20261106160000_dealer_map_location.sql`

Bu dosya `bayi_applications` tablosuna `full_address`, `latitude`, `longitude` ekler. Harita `list_dealer_map_pins()` ile okur. Onaylı bayi konumunu `update_own_dealer_location` ile günceller.

Webdeki ilk form da ön başvuru olsun. Aylık ücret kutusunu kaldır. Alanlar yalnızca: bayi türü, yetkili adı, soyadı, telefon, bayi adı, şehir. Adres ve harita bu formda olmasın.

`src/components/BayiApplicationForm.tsx`

`src/app/api/bayi/application/route.ts`

- Bu altı alan dışında zorunlu tutma. `full_address`, `latitude`, `longitude` boş gelebilir.

Mağaza ayarı webde varsa aynı üç alan oradan da güncellenebilsin. Güncelleme doğrudan tabloya yazılmasın; `update_own_dealer_location` çağrılsın. Onaylı satırda istemci update’i zaten kilitli.
