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
import {
  dealerSignboardPath,
  enrichDealersWithCoverUrls,
  firstBayiPhotoPath,
} from "./bayi-photos";

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
  if (!tableName) {
    return fetchDealersFromApplications(supabase, dealerType, options);
  }

  const selectFull = `
      *,
      cities(name, country_id),
      bayi_applications!inner(
        workplace_photos_json,
        signboard_photo_storage_path,
        status,
        payment_status,
        membership_expires_at,
        authorized_brands,
        working_hours,
        whatsapp_phone,
        first_name,
        last_name
      )
    `;
  const selectCore = `
      *,
      cities(name, country_id),
      bayi_applications!inner(
        workplace_photos_json,
        signboard_photo_storage_path,
        status,
        payment_status,
        membership_expires_at
      )
    `;

  const run = (select: string) => {
    let query = supabase.from(tableName).select(select).eq("is_active", true);
    if (options?.cityId) query = query.eq("city_id", options.cityId);
    if (options?.hasPhone) query = query.not("contact_phone", "is", null);
    if (options?.searchQuery) {
      query = query.ilike("dealer_name", `%${options.searchQuery}%`);
    }
    if (options?.sortBy === "name_asc") {
      query = query.order("dealer_name", { ascending: true });
    } else if (options?.sortBy === "name_desc") {
      query = query.order("dealer_name", { ascending: false });
    } else {
      query = query.order("approved_at", { ascending: false, nullsFirst: false });
    }
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit ?? 20) - 1
      );
    }
    return query;
  };

  let { data, error } = await run(selectFull);
  if (error) {
    const fallback = await run(selectCore);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("fetchPublicDealers error:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const filtered = rows
    .map((dealer) => mapDealerRow(dealer))
    .filter((dealer) => shouldShowInPublicList(dealer.application ?? null));

  return enrichDealersWithCoverUrls(supabase, filtered);
}

async function fetchDealersFromApplications(
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
  let query = supabase
    .from("bayi_applications")
    .select(
      "id, user_id, dealer_name, contact_phone, description, city_id, created_at, workplace_photos_json, signboard_photo_storage_path, status, payment_status, membership_expires_at, approved_at, working_hours, authorized_brands, whatsapp_phone, first_name, last_name, cities(name, country_id)"
    )
    .eq("dealer_type", dealerType)
    .eq("status", "approved");
  if (options?.cityId) query = query.eq("city_id", options.cityId);
  if (options?.hasPhone) query = query.not("contact_phone", "is", null);
  if (options?.searchQuery) {
    query = query.ilike("dealer_name", `%${options.searchQuery}%`);
  }
  if (options?.sortBy === "name_asc") {
    query = query.order("dealer_name", { ascending: true });
  } else if (options?.sortBy === "name_desc") {
    query = query.order("dealer_name", { ascending: false });
  } else {
    query = query.order("approved_at", { ascending: false, nullsFirst: false });
  }
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit ?? 20) - 1
    );
  }
  const { data, error } = await query;
  if (error) {
    console.error("fetchDealersFromApplications error:", error);
    return [];
  }
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const mapped = rows.map((row) =>
    mapDealerRow({
      ...row,
      is_active: true,
      application: row,
      bayi_applications: row,
    })
  );
  const filtered = mapped.filter((dealer) =>
    shouldShowInPublicList(dealer.application ?? null)
  );
  return enrichDealersWithCoverUrls(supabase, filtered);
}

function mapDealerRow(dealer: Record<string, unknown>): DealerProfile {
  const cities = dealer.cities as
    | { name?: string; country_id?: string }
    | { name?: string; country_id?: string }[]
    | null;
  const city = Array.isArray(cities) ? cities[0] : cities;
  const appRaw = dealer.bayi_applications;
  const app = (Array.isArray(appRaw) ? appRaw[0] : appRaw) as
    | DealerProfile["application"]
    | undefined;
  return {
    ...(dealer as unknown as DealerProfile),
    city_name:
      (dealer.city_name as string | undefined) ??
      city?.name ??
      undefined,
    country_id: city?.country_id,
    authorized_brands:
      (dealer.authorized_brands as string | null | undefined) ??
      app?.authorized_brands ??
      null,
    working_hours:
      (dealer.working_hours as string | null | undefined) ??
      app?.working_hours ??
      null,
    whatsapp_phone:
      (dealer.whatsapp_phone as string | null | undefined) ??
      app?.whatsapp_phone ??
      null,
    first_name:
      (dealer.first_name as string | null | undefined) ??
      app?.first_name ??
      null,
    last_name:
      (dealer.last_name as string | null | undefined) ??
      app?.last_name ??
      null,
    application: app,
  };
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

  if (tableName) {
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
        membership_expires_at,
        authorized_brands,
        working_hours,
        whatsapp_phone,
        first_name,
        last_name
      )
    `
      )
      .eq("id", dealerId)
      .maybeSingle();

    if (!error && data) {
      const mapped = mapDealerRow(data as unknown as Record<string, unknown>);
      const [enriched] = await enrichDealersWithCoverUrls(supabase, [mapped]);
      return enriched ?? mapped;
    }
  }

  const { data: app, error: appError } = await supabase
    .from("bayi_applications")
    .select(
      "id, user_id, dealer_name, contact_phone, description, city_id, created_at, workplace_photos_json, signboard_photo_storage_path, status, payment_status, membership_expires_at, approved_at, working_hours, authorized_brands, whatsapp_phone, first_name, last_name, cities(name, country_id)"
    )
    .eq("id", dealerId)
    .eq("dealer_type", dealerType)
    .maybeSingle();
  if (appError || !app) return null;
  const mapped = mapDealerRow({
    ...(app as unknown as Record<string, unknown>),
    is_active: true,
    application: app,
    bayi_applications: app,
  });
  const [enriched] = await enrichDealersWithCoverUrls(supabase, [mapped]);
  return enriched ?? mapped;
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
  if (!tableName) return [];

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
  const profileTable = getDealerProfileTable(dealerType);

  // Toplam bayi sayısı
  const { count: totalDealers } = profileTable
    ? await supabase
        .from(profileTable)
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
    : await supabase
        .from("bayi_applications")
        .select("*", { count: "exact", head: true })
        .eq("dealer_type", dealerType)
        .eq("status", "approved");

  // Bekleyen başvurular
  const { count: pendingApps } = await supabase
    .from("bayi_applications")
    .select("*", { count: "exact", head: true })
    .eq("dealer_type", dealerType)
    .eq("status", "pending");

  const { data: listings } = tableName
    ? await supabase.from(tableName).select("id, price").eq("user_id", userId)
    : { data: [] as { id: string; price: number | null }[] };

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
  supabaseUrl?: string
): string | null {
  if (dealer.cover_image_url) return dealer.cover_image_url;
  const path = firstBayiPhotoPath(dealer);
  if (!path || !supabaseUrl) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = supabaseUrl.replace(/\/$/, "");
  const cleaned = path.replace(/^\/+/, "").replace(/^bayi-application-docs\//, "");
  return `${base}/storage/v1/object/public/bayi-application-docs/${cleaned}`;
}

export function resolveDealerLogoImageUrl(
  dealer: DealerProfile,
  supabaseUrl?: string
): string | null {
  if (dealer.logo_image_url) return dealer.logo_image_url;
  const path = dealerSignboardPath(dealer);
  if (!path || !supabaseUrl) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = supabaseUrl.replace(/\/$/, "");
  const cleaned = path.replace(/^\/+/, "").replace(/^bayi-application-docs\//, "");
  return `${base}/storage/v1/object/public/bayi-application-docs/${cleaned}`;
}
