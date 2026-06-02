/** `public.listing_reports` — mobil uygulama ile aynı şema (reason = konu başlığı) */

export const LISTING_REPORT_REASONS = [
  "Dolandırıcılık",
  "Yanlış kategori",
  "Eksik açıklama",
  "Expertiz yanlış, yok veya yüklenmemiş",
  "Yanıltıcı fiyat veya bilgi",
  "Sahte veya spam ilan",
  "Uygunsuz içerik",
  "Diğer",
] as const;

export type ListingReportReason = (typeof LISTING_REPORT_REASONS)[number];

export const LISTING_REPORT_STATUS_PENDING = "pending" as const;

export type ListingReportRow = {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: string;
  detail: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export function isListingReportReason(v: string): v is ListingReportReason {
  return (LISTING_REPORT_REASONS as readonly string[]).includes(v);
}
