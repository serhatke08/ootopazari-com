/** Google SERP site adı, og:site_name ve WebSite şemasında kullanılır. */
export const SITE_DISPLAY_NAME = "Oto Pazarı";

export const SITE_HOME_TITLE_SUFFIX =
  "İkinci El Araba ve Sıfır Araba İlanları";

export const SITE_HOME_TITLE = `${SITE_DISPLAY_NAME} — ${SITE_HOME_TITLE_SUFFIX}`;

/** Ana sayfa meta description — oto pazarı + ikinci el araba + sıfır araba. */
export const SITE_HOME_DESCRIPTION =
  "Oto Pazarı — Türkiye'nin oto pazarı. İkinci el araba ve sıfır araba ilanlarını keşfedin; ikinci el otomobil ve sıfır otomobil ilanlarına ücretsiz araba ilanı verin, filtreleyin ve satıcıyla mesajlaşın.";

export const SITE_HOME_OG_DESCRIPTION =
  "Oto Pazarı'da ikinci el araba ve sıfır araba ilanları. İkinci el otomobil, sıfır otomobil — ücretsiz araba ilanı ver, filtrele, mesajlaş.";

export const SITE_HOME_TWITTER_DESCRIPTION =
  "Türkiye'nin oto pazarı — ikinci el araba, sıfır araba ve otomobil ilanları.";

/** Ana sayfada görünen kısa tanıtım (H1 altı). */
export const SITE_HOME_INTRO =
  "Türkiye'nin oto pazarında ikinci el araba ve sıfır araba ilanlarını filtreleyin. İkinci el otomobil ve sıfır otomobil ilanlarına ücretsiz araba ilanı verin.";

export const SITE_KEYWORDS = [
  "oto pazarı",
  "oto pazarı ilanları",
  "oto pazarı ikinci el araba",
  "ikinci el araba",
  "ikinci el araba ilanları",
  "sıfır araba",
  "sıfır araba ilanları",
  "ikinci el otomobil",
  "sıfır otomobil",
  "araba ilanları",
  "otomobil ilanları",
  "araba sat",
  "araba al",
  "ücretsiz araba ilanı",
  "ücretsiz ilan ver",
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
