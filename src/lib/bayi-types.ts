/**
 * Bayi (Dealer) sistem tip tanımları
 */

export const DEALER_TYPES = ["galeri", "parcaci", "kiralama", "expertiz"] as const;
export type DealerType = (typeof DEALER_TYPES)[number];

export const DEALER_TYPE_LABELS: Record<DealerType, string> = {
  galeri: "Galeri",
  parcaci: "Parçacı",
  kiralama: "Kiralama",
  expertiz: "Ekspertiz",
};

export const DEALER_TYPE_DESCRIPTIONS: Record<DealerType, string> = {
  galeri: "Araç galerisi - ikinci el araç satışı",
  parcaci: "Yedek parça satışı ve hizmetleri",
  kiralama: "Araç kiralama hizmeti",
  expertiz: "Araç ekspertiz hizmeti",
};

// Aylık ücretler (fallback değerler)
export const DEALER_MONTHLY_FEES: Record<DealerType, number> = {
  galeri: 499.99,
  parcaci: 1499.99,
  kiralama: 1499.99,
  expertiz: 399.99,
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
  workplace_photos_json: string | null;
  signboard_photo_storage_path: string | null;
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
  // Application relation
  application?: {
    workplace_photos_json: string | null;
    signboard_photo_storage_path: string | null;
    status: ApplicationStatus;
    payment_status: PaymentStatus;
    membership_expires_at: string | null;
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
