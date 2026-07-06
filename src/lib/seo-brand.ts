/** Google SERP site adı, og:site_name ve WebSite şemasında kullanılır. */
export const SITE_DISPLAY_NAME = "Oto Pazarı";

/** Google site name: kanonik ana sayfa URL’si (sonda `/`). */
export function canonicalSiteHomeUrl(siteOrigin: string): string {
  const trimmed = siteOrigin.trim().replace(/\/+$/, "");
  return `${trimmed}/`;
}

/** WebSite `alternateName` — marka kısaltmaları (domain değil). */
export const SITE_ALTERNATE_NAMES = [
  "oto pazarı",
  "Oto Pazari",
  "otomobil pazarı",
  "Oto Pazarı ilanları",
] as const;
