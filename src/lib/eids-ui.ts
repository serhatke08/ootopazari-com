/**
 * Client-safe EİDS UI bayrakları / mesajları.
 * (lib/eids.ts server-only — buradan import etme.)
 */

/**
 * Bakanlık EİDS API açılana kadar web’de e-Devlet UI kapalı.
 * false → ilan-ver adımı yok, /profil/eids → /profil, menü/butonlar gizlenir.
 */
export const WEB_EIDS_UI_ENABLED = true;

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
  if (durum === "eids_already_linked") {
    return (
      "Bu e-Devlet hesabı başka bir Oto Pazarı hesabına zaten bağlı. " +
      "Bir e-Devlet yalnızca bir uygulamaya bağlanabilir."
    );
  }
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

/** Plaka / araç yetkisi hatalarını kullanıcı diline çevir. */
export function humanizeEidsLookupError(input: {
  status?: number;
  error?: string | null;
  message?: string | null;
  errors?: string[] | null;
}): string {
  const code = (input.error || "").trim();
  const joined = (input.errors || []).filter(Boolean).join(" · ");
  const raw = (input.message || joined || code || "").trim();

  if (input.status === 401 || code === "unauthorized") {
    return "Oturumun süresi dolmuş. Tekrar giriş yapıp dene.";
  }
  if (code === "plaka_missing" || code === "invalid_json") {
    return "Geçerli bir plaka yaz (ör. 34ABC123).";
  }
  if (code === "eids_user_not_verified") {
    return "Önce e-Devlet ile hesabını doğrula.";
  }
  if (
    code === "ministry_rate_limited" ||
    input.status === 429 ||
    /izin verilen istek sınırı|istek sınırı aşıldı|rate.?limit/i.test(raw)
  ) {
    return (
      "Ticaret Bakanlığı EİDS kotası doldu — uygulama değil, bakanlık limiti. " +
      "Birkaç dakika bekle, sonra bir kez dene. Peş peşe basmak kotayı daha çabuk bitirir."
    );
  }
  if (code === "arac_yetki_failed" || raw) {
    if (/05_Servisten timeout|timeout alindi/i.test(raw)) {
      return "Bakanlık araç servisi yanıt vermedi. Biraz sonra tekrar dene; sürerse entegrasyondestek@ticaret.gov.tr.";
    }
    if (/Servis Bulunamadi|404/i.test(raw)) {
      return "Araç yetki servisi bulunamadı. Destek ekibine bildir.";
    }
    if (/yetki|izin|yetkili değil|bulunamadı/i.test(raw)) {
      return "Bu plaka için yetkin görünmüyor. Plakayı kontrol et; araç sende / yetkilinde değilse bakanlık reddeder.";
    }
    if (isEidsMinistryGateError(raw)) {
      return humanizeEidsFailMessage(raw);
    }
    if (raw && !/^[a-z0-9_]+$/i.test(raw)) {
      return raw;
    }
    return "Plaka sorgusu başarısız. Plakayı kontrol edip tekrar dene.";
  }
  return "Plaka sorgusu başarısız. Biraz sonra tekrar dene.";
}
