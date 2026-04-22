import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/** listings satırı + olası join — şema geniş; fazladan alanları yok sayarız */
export type ListingRow = Record<string, unknown> & {
  id?: string;
  listing_number?: number | string;
  title?: string | null;
  description?: string | null;
  price?: number | null;
  image_url?: string | null;
  city_name?: string | null;
  city_id?: string | null;
  country_name?: string | null;
  category_id?: string | null;
  vehicle_brand_id?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: number | null;
  moderation_status?: string | null;
  created_at?: string | null;
  user_id?: string | null;
  suspension_reason?: string | null;
  suspended_at?: string | null;
};

export type CategoryRow = {
  id: string;
  name: string | null;
  code: string | null;
  sort_order?: number | null;
};

export type CityRow = {
  id: string;
  name: string | null;
  country_id?: string | null;
};

export type VehicleBrandRow = {
  id: string;
  name: string | null;
  code?: string | null;
  category_id?: string | null;
  sort_order?: number | null;
};

const LISTING_SELECT = [
  "id",
  "listing_number",
  "title",
  "description",
  "price",
  "image_url",
  "city_name",
  "city_id",
  "country_name",
  "category_id",
  "vehicle_brand_id",
  "vehicle_model",
  "vehicle_year",
  "fuel_type",
  "transmission_type",
  "vehicle_mileage",
  "created_at",
  "updated_at",
  "user_id",
  "moderation_status",
  "suspension_reason",
  "suspended_at",
  "contact_phone",
  "contact_via_phone",
  "contact_via_message",
].join(", ");

const LISTING_EDIT_EXTRA = [
  "is_fixed_price",
  "is_negotiable",
  "district",
  "engine_capacity",
  "engine_power",
  "color",
  "body_type",
  "drive_type",
  "has_expertise",
  "is_damaged",
  "is_tradeable",
  "expertiz_panels",
  "images",
] as const;

const LISTING_OWNER_EDIT_SELECT = [
  ...LISTING_SELECT.split(", "),
  ...LISTING_EDIT_EXTRA,
].join(", ");

export const fetchCategories = cache(async function fetchCategories(
  supabase: SupabaseClient
): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,code,sort_order")
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (error) {
    console.warn("categories:", error.message);
    return [];
  }
  return (data ?? []) as CategoryRow[];
});

/** Türkiye satırını `countries` tablosundan bulur (iso/code alan adları projeden projeye değişebilir). */
async function resolveTurkeyCountryId(
  supabase: SupabaseClient
): Promise<string | null> {
  const envId = process.env.NEXT_PUBLIC_TURKEY_COUNTRY_ID?.trim();
  if (envId) return envId;

  const { data, error } = await supabase
    .from("countries")
    .select("id")
    .or(
      [
        "iso_code.eq.TR",
        "code.eq.TR",
        "iso2.eq.TR",
        "alpha_2.eq.TR",
        "alpha2.eq.TR",
      ].join(",")
    )
    .limit(1);

  if (!error && data?.[0]?.id != null) return String(data[0].id);

  const { data: byName, error: nameErr } = await supabase
    .from("countries")
    .select("id")
    .or("name.ilike.%türkiye%,name.ilike.%turkiye%")
    .limit(1)
    .maybeSingle();

  if (!nameErr && byName?.id != null) return String(byName.id);

  return null;
}

/** `cities` ↔ `countries` ilişkisi üzerinden TR kodu ile filtre (country id çözülemezse). */
async function fetchCitiesTurkeyViaJoin(
  supabase: SupabaseClient
): Promise<CityRow[] | null> {
  const isoFields = ["iso_code", "code", "iso2", "alpha_2", "alpha2"] as const;
  for (const field of isoFields) {
    const { data, error } = await supabase
      .from("cities")
      .select(`id,name,country_id,countries!inner(${field})`)
      .eq(`countries.${field}`, "TR")
      .order("name", { ascending: true });
    if (!error && data) {
      return (data as CityRow[]).map((c) => ({
        id: String(c.id),
        name: c.name ?? null,
        country_id: c.country_id != null ? String(c.country_id) : null,
      }));
    }
  }
  return null;
}

export async function fetchCities(supabase: SupabaseClient): Promise<CityRow[]> {
  const turkeyId = await resolveTurkeyCountryId(supabase);

  if (turkeyId) {
    const { data, error } = await supabase
      .from("cities")
      .select("id,name,country_id")
      .eq("country_id", turkeyId)
      .order("name", { ascending: true });

    if (!error) return (data ?? []) as CityRow[];
    console.warn("cities (TR country_id):", error.message);
  }

  const viaJoin = await fetchCitiesTurkeyViaJoin(supabase);
  if (viaJoin) return viaJoin;

  if (!turkeyId) {
    console.warn(
      "fetchCities: Türkiye `countries` kaydı bulunamadı; şehirler filtrelenemedi. Gerekirse NEXT_PUBLIC_TURKEY_COUNTRY_ID ayarlayın."
    );
  }

  const { data, error } = await supabase
    .from("cities")
    .select("id,name,country_id")
    .order("name", { ascending: true });

  if (error) {
    console.warn("cities:", error.message);
    return [];
  }
  return (data ?? []) as CityRow[];
}

export async function fetchVehicleBrands(
  supabase: SupabaseClient,
  categoryId?: string | null
): Promise<VehicleBrandRow[]> {
  const cat = categoryId ?? null;

  const tries = [
    () => {
      let q = supabase
        .from("vehicle_brands")
        .select("id,name,code,category_id,sort_order,created_at");
      if (cat) q = q.eq("category_id", cat);
      return q
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
    },
    () => {
      let q = supabase
        .from("vehicle_brands")
        .select("id,name,code,category_id,sort_order");
      if (cat) q = q.eq("category_id", cat);
      return q
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });
    },
    () => {
      let q = supabase
        .from("vehicle_brands")
        .select("id,name,code,category_id,created_at");
      if (cat) q = q.eq("category_id", cat);
      return q.order("created_at", { ascending: true });
    },
    () => {
      let q = supabase.from("vehicle_brands").select("id,name,code,category_id");
      if (cat) q = q.eq("category_id", cat);
      return q.order("id", { ascending: true });
    },
  ];

  let lastErr: { message?: string } | null = null;
  for (const run of tries) {
    const { data, error } = await run();
    if (!error) return (data ?? []) as VehicleBrandRow[];
    lastErr = error;
  }
  console.warn("vehicle_brands:", lastErr?.message);
  return [];
}

export type ListingListParams = {
  page: number;
  pageSize: number;
  categoryId?: string;
  cityId?: string;
  vehicleBrandId?: string;
  /** `listings.vehicle_model` üzerinde kısmi eşleşme (seri adı / kodu) */
  vehicleModel?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  q?: string;
};

export async function fetchListingsPage(
  supabase: SupabaseClient,
  params: ListingListParams
): Promise<{ rows: ListingRow[]; total: number }> {
  const { page, pageSize } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("listings")
    .select(LISTING_SELECT, { count: "exact" })
    .eq("moderation_status", "approved");

  if (params.categoryId) q = q.eq("category_id", params.categoryId);
  if (params.cityId) q = q.eq("city_id", params.cityId);
  if (params.vehicleBrandId) q = q.eq("vehicle_brand_id", params.vehicleBrandId);
  /** Not: `vehicle_brand_model_id` kolonu şemada yoksa kullanılamaz; seri seçiminde `vehicle_model` dolar. */
  if (params.vehicleModel?.trim()) {
    const esc = params.vehicleModel
      .trim()
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    q = q.ilike("vehicle_model", `%${esc}%`);
  }
  if (params.minPrice != null) q = q.gte("price", params.minPrice);
  if (params.maxPrice != null) q = q.lte("price", params.maxPrice);
  if (params.minYear != null) q = q.gte("vehicle_year", params.minYear);
  if (params.maxYear != null) q = q.lte("vehicle_year", params.maxYear);
  if (params.q?.trim()) {
    const esc = params.q
      .trim()
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    const t = `%${esc}%`;
    q = q.or(`title.ilike.${t},description.ilike.${t}`);
  }

  q = q.order("created_at", { ascending: false, nullsFirst: false });
  const { data, error, count } = await q.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: (data ?? []) as unknown as ListingRow[],
    total: count ?? 0,
  };
}

export async function fetchRecentListings(
  supabase: SupabaseClient,
  limit: number
): Promise<ListingRow[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.warn("recent listings:", error.message);
    return [];
  }
  return (data ?? []) as unknown as ListingRow[];
}

/** SEO URL: `listing_number` benzersiz (8 hane). */
export async function fetchListingByNumber(
  supabase: SupabaseClient,
  listingNumber: string
): Promise<ListingRow | null> {
  const n = Number(listingNumber);
  if (!Number.isFinite(n)) return null;

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("moderation_status", "approved")
    .eq("listing_number", n)
    .maybeSingle();

  if (error) {
    console.warn("listing by number:", error.message);
    return null;
  }
  if (!data || typeof data !== "object") return null;
  return data as ListingRow;
}

export type ListingDetailAccessMode =
  | "public"
  | "suspended_owner"
  | "suspended_admin";

/**
 * İlan detay: onaylı herkese açık; askıya alınmışsa sahibi veya admin görebilir (RLS izin veriyorsa).
 */
export async function fetchListingForDetailPage(
  supabase: SupabaseClient,
  listingNumber: string,
  viewerUserId: string | null,
  options?: { viewerIsAdmin?: boolean }
): Promise<{ listing: ListingRow; access: ListingDetailAccessMode } | null> {
  const n = Number(listingNumber);
  if (!Number.isFinite(n)) return null;

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("listing_number", n)
    .maybeSingle();

  if (error) {
    console.warn("fetchListingForDetailPage:", error.message);
    return null;
  }
  if (!data || typeof data !== "object") return null;

  const row = data as ListingRow;
  const status = String(row.moderation_status ?? "").toLowerCase();
  const ownerId = row.user_id != null ? String(row.user_id) : "";
  const viewer = viewerUserId?.trim() ?? "";
  const viewerIsAdmin = options?.viewerIsAdmin === true;

  if (status === "approved") {
    return { listing: row, access: "public" };
  }

  if (status === "suspended") {
    if (viewer && ownerId && viewer === ownerId) {
      return { listing: row, access: "suspended_owner" };
    }
    if (viewerIsAdmin) {
      return { listing: row, access: "suspended_admin" };
    }
    return null;
  }

  return null;
}

export function isListingSuspended(listing: ListingRow): boolean {
  return String(listing.moderation_status ?? "").toLowerCase() === "suspended";
}

export async function fetchListingsByIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<ListingRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("moderation_status", "approved")
    .in("id", ids);

  if (error) {
    console.warn("fetchListingsByIds:", error.message);
    return [];
  }
  return (data ?? []) as unknown as ListingRow[];
}

/** Oturum açmış kullanıcının kendi ilanları (moderasyon filtresi yok; RLS ile sınırlanır). */
export async function fetchListingsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<ListingRow[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.warn("fetchListingsForUser:", error.message);
    return [];
  }
  return (data ?? []) as unknown as ListingRow[];
}

/** Herkesin görebileceği profil ziyaret sayfası için: yalnızca onaylı ilanlar. */
export async function fetchApprovedListingsForUserPublic(
  supabase: SupabaseClient,
  userId: string,
  limit = 60
): Promise<ListingRow[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("moderation_status", "approved")
    .eq("user_id", userId)
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.warn("fetchApprovedListingsForUserPublic:", error.message);
    return [];
  }
  return (data ?? []) as unknown as ListingRow[];
}

/** İlan sahibinin düzenleme formu için (geniş kolon seti). */
export async function fetchListingForOwnerByNumber(
  supabase: SupabaseClient,
  listingNumber: string,
  userId: string
): Promise<ListingRow | null> {
  const n = Number(listingNumber);
  if (!Number.isFinite(n)) return null;

  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_OWNER_EDIT_SELECT)
    .eq("listing_number", n)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("fetchListingForOwnerByNumber:", error.message);
    return null;
  }
  if (!data || typeof data !== "object") return null;
  return data as unknown as ListingRow;
}

export async function fetchProfilePublic(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,username,full_name,avatar_url,phone,created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("profiles:", error.message);
    return null;
  }
  return data as Record<string, unknown> | null;
}

export function buildCategoryMap(cats: CategoryRow[]): Map<string, CategoryRow> {
  return new Map(cats.map((c) => [c.id, c]));
}

export function buildCityMap(cities: CityRow[]): Map<string, CityRow> {
  return new Map(cities.map((c) => [c.id, c]));
}

/** `city_name` boşsa `city_id` + şehir listesinden ad üretir (kartlarda gösterim). */
export function resolveListingCityDisplay(
  listing: ListingRow,
  cityMap: Map<string, CityRow>
): string | null {
  const direct =
    listing.city_name != null ? String(listing.city_name).trim() : "";
  if (direct) return direct;
  const id = listing.city_id;
  if (!id) return null;
  const n = cityMap.get(String(id))?.name;
  const t = n != null ? String(n).trim() : "";
  return t || null;
}

export function buildBrandMap(brands: VehicleBrandRow[]): Map<string, VehicleBrandRow> {
  return new Map(brands.map((b) => [b.id, b]));
}

/** İlan sayısı gösterimi (örn. filtre etiketleri) */
export function formatListingCount(n: number): string {
  return n.toLocaleString("tr-TR");
}

/** Onaylı ilan toplamı (sayfalama dışı) */
export async function fetchApprovedListingsTotal(
  supabase: SupabaseClient
): Promise<number> {
  const { count, error } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("moderation_status", "approved");

  if (error) {
    console.warn("approved listings total:", error.message);
    return 0;
  }
  return count ?? 0;
}

export type ListingCountGroupField =
  | "category_id"
  | "city_id"
  | "vehicle_brand_id";

/**
 * Onaylı ilanları tek alana göre gruplayıp sayar (büyük tabloda sayfalı okur).
 * `vehicle_brand_id` + `categoryId`: yalnız o kategorideki marka dağılımı.
 */
export async function fetchApprovedListingCountsByField(
  supabase: SupabaseClient,
  field: ListingCountGroupField,
  options?: { categoryId?: string | null }
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    let q = supabase
      .from("listings")
      .select(field)
      .eq("moderation_status", "approved");
    if (options?.categoryId) {
      q = q.eq("category_id", options.categoryId);
    }
    const { data, error } = await q.range(from, from + pageSize - 1);
    if (error) {
      console.warn("listing counts by field:", field, error.message);
      return map;
    }
    const rows = (data ?? []) as Record<string, string | null>[];
    for (const row of rows) {
      const key = row[field];
      if (key == null || key === "") continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return map;
}

/** `vehicle_model` metnini sayaç eşlemesi için normalize eder (trim + tr küçük harf). */
export function normalizeListingModelKey(s: string | null | undefined): string {
  return (s ?? "").trim().toLocaleLowerCase("tr");
}

/**
 * Seçili kategori + marka için ilanlardaki `vehicle_model` alanına göre sayım
 * (şema `vehicle_model` string tutuyorsa model satırıyla eşleştirilebilir).
 */
/**
 * Kategori + marka için `listings.vehicle_brand_model_id` dağılımı (seri rozetleri).
 */
export async function fetchApprovedListingCountsByVehicleBrandModelId(
  supabase: SupabaseClient,
  options: { categoryId: string; vehicleBrandId: string }
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("listings")
      .select("vehicle_brand_model_id")
      .eq("moderation_status", "approved")
      .eq("category_id", options.categoryId)
      .eq("vehicle_brand_id", options.vehicleBrandId)
      .range(from, from + pageSize - 1);

    if (error) {
      console.warn("listing counts by vehicle_brand_model_id:", error.message);
      return map;
    }
    const rows = (data ?? []) as { vehicle_brand_model_id?: string | null }[];
    for (const row of rows) {
      const key = row.vehicle_brand_model_id;
      if (key == null || key === "") continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return map;
}

export async function fetchApprovedListingCountsByVehicleModel(
  supabase: SupabaseClient,
  options: { categoryId: string; vehicleBrandId: string }
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("listings")
      .select("vehicle_model")
      .eq("moderation_status", "approved")
      .eq("category_id", options.categoryId)
      .eq("vehicle_brand_id", options.vehicleBrandId)
      .range(from, from + pageSize - 1);

    if (error) {
      console.warn("listing counts by vehicle_model:", error.message);
      return map;
    }
    const rows = (data ?? []) as { vehicle_model?: string | null }[];
    for (const row of rows) {
      const key = normalizeListingModelKey(row.vehicle_model);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return map;
}

export type SitemapListingRow = {
  listingNumber: string;
  lastModified: Date | undefined;
};

/** Onaylı ilanlar — SEO site haritası (sayfalı, yalnız numara + tarih). */
export async function fetchApprovedListingsForSitemap(
  supabase: SupabaseClient
): Promise<SitemapListingRow[]> {
  const pageSize = 1000;
  let from = 0;
  const out: SitemapListingRow[] = [];

  for (;;) {
    const { data, error } = await supabase
      .from("listings")
      .select("listing_number,updated_at")
      .eq("moderation_status", "approved")
      .order("listing_number", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.warn("sitemap listings:", error.message);
      break;
    }

    const rows = (data ?? []) as {
      listing_number?: number | string;
      updated_at?: string | null;
    }[];

    for (const row of rows) {
      if (row.listing_number == null) continue;
      const listingNumber = String(row.listing_number).trim();
      if (!listingNumber) continue;
      let lastModified: Date | undefined;
      if (row.updated_at) {
        const d = new Date(row.updated_at);
        if (!Number.isNaN(d.getTime())) lastModified = d;
      }
      out.push({ listingNumber, lastModified });
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return out;
}
