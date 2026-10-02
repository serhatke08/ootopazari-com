/**
 * Client-safe EİDS UI bayrakları / mesajları.
 * (lib/eids.ts server-only — buradan import etme.)
 */

/**
 * Bakanlık EİDS API açılana kadar web’de e-Devlet UI kapalı.
 * false → ilan-ver adımı yok, /profil/eids → /profil, menü/butonlar gizlenir.
 */
export const WEB_EIDS_UI_ENABLED = false;

/** Bakanlık 03_ = API kapısı / aktivasyon; kullanıcı telefon hatası değil. */
export function isEidsMinistryGateError(
  durum: string | null | undefined
): boolean {
  if (!durum) return false;
  return (
    durum.includes("03_") || /kullanici bilgilerini kontrol/i.test(durum)
  );
}

/** UI için kısa, doğru açıklama (ham 03_ mesajını kullanıcıya yansıtma). */
export function humanizeEidsFailMessage(
  durum: string | null | undefined
): string {
  if (isEidsMinistryGateError(durum)) {
    return (
      "e-Devlet girişi tamamlandı; Ticaret Bakanlığı API şu an kullanıcı kodunu vermiyor (03_). " +
      "Bu senin hatan değil — bakanlık tarafında API aktivasyonu bekleniyor. Bir süre sonra tekrar dene."
    );
  }
  if (durum && durum.trim()) {
    return `e-Devlet doğrulaması başarısız: ${durum}. Tekrar dene.`;
  }
  return "e-Devlet doğrulaması başarısız. Tekrar dene.";
}
