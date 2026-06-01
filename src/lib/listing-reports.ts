/** `public.listing_reports` — mobil uygulama ile aynı şema */

export const LISTING_REPORT_REASONS = [
  "Yanıltıcı bilgi",
  "Yanlış kategori",
  "Spam",
  "Sahte ilan",
  "Uygunsuz içerik",
  "Fiyat / dolandırıcılık şüphesi",
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
