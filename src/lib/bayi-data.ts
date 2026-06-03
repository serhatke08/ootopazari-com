/**
 * Bayi (Dealer) veri katmanı - Supabase sorguları
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BayiApplication,
  DealerProfile,
  DealerType,
  DealerAnalytics,
} from "./bayi-types";
import { getDealerProfileTable, getDealerListingTable } from "./dealer-listing-tables";
import { shouldShowInPublicList } from "./bayi-application-status";

/**
 * Kullanıcının belirli bir dealer type için başvurusunu getirir
 */
export async function fetchUserDealerApplication(
  supabase: SupabaseClient,
  userId: string,
  dealerType: DealerType
): Promise<BayiApplication | null> {
  const { data, error } = await supabase
    .from("bayi_applications")
    .select("*")
    .eq("user_id", userId)
    .eq("dealer_type", dealerType)
    .maybeSingle();

  if (error) {
    console.error("fetchUserDealerApplication error:", error);
    return null;
  }

  return data as BayiApplication | null;
}

/**
 * Public dealer listesini getirir (aktif üyeliği olanlar)
 */
export async function fetchPublicDealers(
  supabase: SupabaseClient,
  dealerType: DealerType,
  options?: {
    cityId?: string;
    searchQuery?: string;
    hasPhone?: boolean;
    sortBy?: "newest" | "name_asc" | "name_desc";
    limit?: number;
    offset?: number;
  }
): Promise<DealerProfile[]> {
  const tableName = getDealerProfileTable(dealerType);

  let query = supabase
    .from(tableName)
    .select(
      `
      *,
      cities(name, country_id),
      bayi_applications!inner(
        workplace_photos_json,
        signboard_photo_storage_path,
        status,
        payment_status,
        membership_expires_at
      )
    `
    )
    .eq("is_active", true);

  // City filter
  if (options?.cityId) {
    query = query.eq("city_id", options.cityId);
  }

  // Phone filter
  if (options?.hasPhone) {
    query = query.not("contact_phone", "is", null);
  }

  // Search
  if (options?.searchQuery) {
    query = query.ilike("dealer_name", `%${options.searchQuery}%`);
  }

  // Sort
  if (options?.sortBy === "newest") {
    query = query.order("approved_at", { ascending: false, nullsFirst: false });
  } else if (options?.sortBy === "name_asc") {
    query = query.order("dealer_name", { ascending: true });
  } else if (options?.sortBy === "name_desc") {
    query = query.order("dealer_name", { ascending: false });
  }

  // Pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error("fetchPublicDealers error:", error);
    return [];
  }

  // Filter by active membership
  const filtered = (data ?? []).filter((dealer: any) => {
    const app = Array.isArray(dealer.bayi_applications)
      ? dealer.bayi_applications[0]
      : dealer.bayi_applications;
    return shouldShowInPublicList(app);
  });

  return filtered as DealerProfile[];
}

/**
 * Tek bir dealer profilini getirir
 */
export async function fetchDealerProfile(
  supabase: SupabaseClient,
  dealerType: DealerType,
  dealerId: string
): Promise<DealerProfile | null> {
  const tableName = getDealerProfileTable(dealerType);

  const { data, error } = await supabase
    .from(tableName)
    .select(
      `
      *,
      cities(name, country_id),
      bayi_applications(
        workplace_photos_json,
        signboard_photo_storage_path,
        status,
        payment_status,
        membership_expires_at
      )
    `
    )
    .eq("id", dealerId)
    .maybeSingle();

  if (error) {
    console.error("fetchDealerProfile error:", error);
    return null;
  }

  return data as DealerProfile | null;
}

/**
 * Dealer için ilanları/ürünleri getirir
 */
export async function fetchDealerListings(
  supabase: SupabaseClient,
  dealerType: DealerType,
  dealerId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const tableName = getDealerListingTable(dealerType);

  let query = supabase
    .from(tableName)
    .select("*")
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error("fetchDealerListings error:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Dealer analytics verilerini getirir (owner için)
 */
export async function fetchDealerAnalytics(
  supabase: SupabaseClient,
  dealerType: DealerType,
  userId: string
): Promise<DealerAnalytics | null> {
  // Bu fonksiyon dealer'ın kendi istatistiklerini getirir
  // Şimdilik basit bir implementasyon, daha sonra RPC'ye dönüştürülebilir

  const tableName = getDealerListingTable(dealerType);

  // Toplam bayi sayısı
  const { count: totalDealers } = await supabase
    .from(getDealerProfileTable(dealerType))
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Bekleyen başvurular
  const { count: pendingApps } = await supabase
    .from("bayi_applications")
    .select("*", { count: "exact", head: true })
    .eq("dealer_type", dealerType)
    .eq("status", "pending");

  // Owner'ın ilanları
  const { data: listings } = await supabase
    .from(tableName)
    .select("id, price")
    .eq("user_id", userId);

  const listingIds = (listings ?? []).map((l) => l.id);

  // View counts
  let totalViews = 0;
  if (listingIds.length > 0) {
    const { count } = await supabase
      .from("listing_views")
      .select("*", { count: "exact", head: true })
      .in("listing_id", listingIds);
    totalViews = count ?? 0;
  }

  // Favorite counts
  let totalFavorites = 0;
  if (listingIds.length > 0) {
    const { count } = await supabase
      .from("user_favorites")
      .select("*", { count: "exact", head: true })
      .in("listing_id", listingIds);
    totalFavorites = count ?? 0;
  }

  const totalListings = listings?.length ?? 0;
  const avgViewsPerListing = totalListings > 0 ? totalViews / totalListings : 0;

  const prices = (listings ?? [])
    .map((l) => l.price)
    .filter((p): p is number => p != null);
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  return {
    total_dealers: totalDealers ?? 0,
    pending_applications: pendingApps ?? 0,
    total_listings: totalListings,
    total_views: totalViews,
    total_favorites: totalFavorites,
    avg_views_per_listing: Math.round(avgViewsPerListing * 10) / 10,
    avg_listing_price: Math.round(avgPrice),
  };
}

/**
 * Bayi başvurusu oluşturur
 */
export async function createDealerApplication(
  supabase: SupabaseClient,
  userId: string,
  data: {
    dealer_type: DealerType;
    first_name: string;
    last_name: string;
    contact_phone: string;
    dealer_name: string;
    city_id: string;
    monthly_fee_amount: number;
  }
) {
  const { data: result, error } = await supabase
    .from("bayi_applications")
    .insert({
      user_id: userId,
      dealer_type: data.dealer_type,
      first_name: data.first_name,
      last_name: data.last_name,
      contact_phone: data.contact_phone,
      dealer_name: data.dealer_name,
      city_id: data.city_id,
      monthly_fee_amount: data.monthly_fee_amount,
      status: "pending",
      payment_status: "unpaid",
    })
    .select()
    .single();

  if (error) {
    console.error("createDealerApplication error:", error);
    throw error;
  }

  return result as BayiApplication;
}

/**
 * Dealer cover image URL'ini çözümler
 */
export function resolveDealerCoverImageUrl(
  dealer: DealerProfile,
  supabaseUrl: string
): string | null {
  const app = dealer.application;
  if (!app) return null;

  // 1. workplace_photos_json içindeki ilk foto
  if (app.workplace_photos_json) {
    try {
      const photos = JSON.parse(app.workplace_photos_json);
      if (Array.isArray(photos) && photos.length > 0) {
        const firstPhoto = photos[0];
        if (typeof firstPhoto === "string" && firstPhoto.trim()) {
          return `${supabaseUrl}/storage/v1/object/public/bayi-application-docs/${firstPhoto}`;
        }
      }
    } catch (e) {
      console.error("Error parsing workplace_photos_json:", e);
    }
  }

  // 2. signboard_photo_storage_path
  if (app.signboard_photo_storage_path) {
    return `${supabaseUrl}/storage/v1/object/public/bayi-application-docs/${app.signboard_photo_storage_path}`;
  }

  // 3. İlk ilanın image_url'i (şimdilik null, isteğe göre implement edilebilir)
  return null;
}
