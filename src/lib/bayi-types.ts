/**
 * Bayi (Dealer) sistem tip tanımları
 */

export const DEALER_TYPES = [
  "galeri",
  "expertiz",
  "kiralama",
  "parcaci",
  "aksesuar",
  "servis",
  "kaporta",
  "lastik",
  "cekici",
  "oto_elektrik",
  "yikama",
  "sigorta",
] as const;
export type DealerType = (typeof DEALER_TYPES)[number];

export const DEALER_TYPE_LABELS: Record<DealerType, string> = {
  galeri: "Galeri",
  parcaci: "Yedek Parça",
  kiralama: "Kiralama",
  expertiz: "Expertiz",
  aksesuar: "Aksesuar",
  servis: "Servis",
  kaporta: "Kaporta ve Boya",
  lastik: "Lastik",
  cekici: "Çekici",
  oto_elektrik: "Oto Elektrik",
  yikama: "Yıkama",
  sigorta: "Sigorta",
};

export const DEALER_TYPE_DESCRIPTIONS: Record<DealerType, string> = {
  galeri: "Araç galerisi - ikinci el araç satışı",
  parcaci: "Yedek parça satışı ve hizmetleri",
  kiralama: "Araç kiralama hizmeti",
  expertiz: "Araç ekspertiz hizmeti",
  aksesuar: "Oto aksesuar satış ve montaj",
  servis: "Oto servis ve bakım",
  kaporta: "Kaporta ve boya",
  lastik: "Lastik satış ve değişim",
  cekici: "Çekici ve yol yardım",
  oto_elektrik: "Oto elektrik",
  yikama: "Araç yıkama",
  sigorta: "Sigorta",
};

/** Uygulama ile aynı: tek seferlik bayi açılış ücreti. */
export const DEALER_SETUP_FEE_TRY = 500;

/** Geriye dönük isim — artık hepsi 500 TL tek seferlik. */
export const DEALER_MONTHLY_FEES: Record<DealerType, number> = {
  galeri: DEALER_SETUP_FEE_TRY,
  parcaci: DEALER_SETUP_FEE_TRY,
  kiralama: DEALER_SETUP_FEE_TRY,
  expertiz: DEALER_SETUP_FEE_TRY,
  aksesuar: DEALER_SETUP_FEE_TRY,
  servis: DEALER_SETUP_FEE_TRY,
  kaporta: DEALER_SETUP_FEE_TRY,
  lastik: DEALER_SETUP_FEE_TRY,
  cekici: DEALER_SETUP_FEE_TRY,
  oto_elektrik: DEALER_SETUP_FEE_TRY,
  yikama: DEALER_SETUP_FEE_TRY,
  sigorta: DEALER_SETUP_FEE_TRY,
};

// Application status
export type ApplicationStatus = "pending" | "approved" | "rejected";

// Payment status
export type PaymentStatus = "unpaid" | "awaiting_payment" | "paid" | "overdue";

// Normalized dealer state
export type DealerState =
  | "pending" // başvuru inceleniyor
  | "approved_awaiting_payment" // onaylı ama ödeme bekleniyor
  | "active" // bayi aktif (approved + paid)
  | "overdue" // üyelik pasife düşmüş
  | "rejected"; // reddedilmiş

export interface BayiApplication {
  id: string;
  user_id: string;
  dealer_type: DealerType;
  first_name: string;
  last_name: string;
  city_id: string | null;
  dealer_name: string;
  contact_phone: string;
  description: string | null;
  status: ApplicationStatus;
  payment_status: PaymentStatus;
  monthly_fee_amount: number;
  payment_paid_at: string | null;
  membership_starts_at: string | null;
  membership_expires_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  workplace_photos_json?: unknown;
  signboard_photo_storage_path: string | null;
  working_hours?: string | null;
  authorized_brands?: string | null;
  whatsapp_phone?: string | null;
  full_address?: string | null;
  listing_subscription_active?: boolean | null;
}

export interface DealerProfile {
  id: string;
  dealer_name: string;
  contact_phone: string | null;
  description: string | null;
  city_id: string | null;
  is_active: boolean;
  approved_at: string | null;
  price_list?: ExpertizPriceItem[] | null; // sadece expertiz için
  user_id?: string;
  // Relations
  city_name?: string;
  country_id?: string;
  authorized_brands?: string | null;
  working_hours?: string | null;
  whatsapp_phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  cover_image_url?: string | null;
  logo_image_url?: string | null;
  // Application relation
  application?: {
    workplace_photos_json?: unknown;
    signboard_photo_storage_path: string | null;
    status: ApplicationStatus;
    payment_status: PaymentStatus;
    membership_expires_at: string | null;
    authorized_brands?: string | null;
    working_hours?: string | null;
    whatsapp_phone?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
}

export interface ExpertizPriceItem {
  service: string;
  price: number;
  description?: string;
}

export interface DealerListing {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  city_id: string | null;
  created_at: string;
  // Kiralama specific
  rental_available?: boolean;
  rental_vehicle_status?: "available" | "rented" | "service" | "unavailable";
  rental_weekly_price?: number;
  rental_monthly_price?: number;
}

export interface DealerAnalytics {
  total_dealers: number;
  pending_applications: number;
  total_listings: number;
  total_views: number;
  total_favorites: number;
  avg_views_per_listing: number;
  avg_listing_price: number;
}

export interface BayiApplicationFormData {
  dealer_type: DealerType;
  first_name: string;
  last_name: string;
  contact_phone: string;
  dealer_name: string;
  city_id: string;
}
