/** Google SERP site adı, og:site_name ve WebSite şemasında kullanılır. */
export const SITE_DISPLAY_NAME = "Oto Pazarı";

/** Google ana sonuç title — kısa marka adı. */
export const SITE_HOME_TITLE = SITE_DISPLAY_NAME;

/** Description / intro için anahtar kelime özeti (title değil). */
export const SITE_HOME_TITLE_SUFFIX =
  "İkinci El Araba, Sıfır Araba, Kiralık Araç ve Yedek Parça";

/** Ana sayfa meta description — oto pazarı + dikeyler. */
export const SITE_HOME_DESCRIPTION =
  "Oto Pazarı — Türkiye'nin oto pazarı. İkinci el araç, sıfır araç, kiralık araç ve oto yedek parça ilanlarını keşfedin; ücretsiz ilan verin, filtreleyin, satıcıyla mesajlaşın.";

export const SITE_HOME_OG_DESCRIPTION =
  "Oto Pazarı'da ikinci el araç, sıfır araç, kiralık araç ve yedek parça. Ücretsiz ilan ver, filtrele, mesajlaş.";

export const SITE_HOME_TWITTER_DESCRIPTION =
  "Türkiye'nin oto pazarı — ikinci el, sıfır, kiralık araç ve parça ilanları.";

/** Ana sayfada görünen kısa tanıtım (H1 altı). */
export const SITE_HOME_INTRO =
  "İkinci el araç, sıfır araç, kiralık araç ve oto yedek parça ilanlarını tek yerde bulun. Ücretsiz ilan verin, filtreleyin, satıcıyla mesajlaşın.";

export const SITE_KEYWORDS = [
  "oto pazarı",
  "oto pazarı ilanları",
  "otopazarı",
  "ikinci el araç",
  "ikinci el araba",
  "ikinci el araba ilanları",
  "sıfır araç",
  "sıfır araba",
  "sıfır araba ilanları",
  "kiralık araç",
  "araç kiralama",
  "oto yedek parça",
  "yedek parça",
  "ikinci el otomobil",
  "sıfır otomobil",
  "araba ilanları",
  "otomobil ilanları",
  "ücretsiz araba ilanı",
  "galeri",
  "ekspertiz",
] as const;

/** Google site name: kanonik ana sayfa URL’si (sonda `/`). */
export function canonicalSiteHomeUrl(siteOrigin: string): string {
  const trimmed = siteOrigin.trim().replace(/\/+$/, "");
  return `${trimmed}/`;
}

/** WebSite `alternateName` — marka ve arama varyasyonları (domain değil). */
export const SITE_ALTERNATE_NAMES = [
  "oto pazarı",
  "Oto Pazari",
  "otomobil pazarı",
  "Oto Pazarı ilanları",
  "ikinci el araba ilanları",
  "sıfır araba ilanları",
] as const;
