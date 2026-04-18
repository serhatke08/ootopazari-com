/**
 * Arama kutusundan gelen metni ilan numarasına çevirir (# öneki isteğe bağlı).
 * Ana sayfa aramasındaki doğrudan ilan detayı yönlendirmesiyle aynı: 6–14 hane rakam.
 */
export function listingNumberFromSearchQuery(raw: string): string | null {
  const withoutHash = raw.trim().replace(/^#+/, "").trim();
  if (!/^\d{6,14}$/.test(withoutHash)) return null;
  return withoutHash;
}
