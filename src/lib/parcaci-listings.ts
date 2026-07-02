import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveDealerCoverImageUrl } from "@/lib/bayi-data";
import type { DealerProfile } from "@/lib/bayi-types";

export type PartCondition = "sifir" | "ikinci_el" | "belirsiz";

export type ParcaciListingCardItem = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  condition: PartCondition;
  cityName: string | null;
  dealerId: string | null;
  dealerName: string | null;
  createdAt: string | null;
};

function normalizeCondition(raw: unknown): PartCondition {
  if (typeof raw !== "string") return "belirsiz";
  const value = raw.trim().toLocaleLowerCase("tr");
  if (value.includes("sıfır") || value.includes("sifir") || value === "new") {
    return "sifir";
  }
  if (
    value.includes("ikinci") ||
    value.includes("2.el") ||
    value.includes("2el") ||
    value === "used"
  ) {
    return "ikinci_el";
  }
  return "belirsiz";
}

function toSafeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickImageUrl(row: Record<string, unknown>): string | null {
  const candidates = [
    row.image_url,
    row.cover_image_url,
    row.image,
    row.photo_url,
    row.thumbnail_url,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

function toCardItem(row: Record<string, unknown>): ParcaciListingCardItem {
  const conditionRaw =
    row.condition ?? row.part_condition ?? row.condition_status ?? row.product_condition;
  return {
    id: String(row.id ?? ""),
    title: typeof row.title === "string" && row.title.trim() ? row.title.trim() : "Parça ilanı",
    description: typeof row.description === "string" ? row.description.trim() || null : null,
    price: toSafeNumber(row.price),
    imageUrl: pickImageUrl(row),
    condition: normalizeCondition(conditionRaw),
    cityName: typeof row.city_name === "string" ? row.city_name : null,
    dealerId: typeof row.dealer_id === "string" ? row.dealer_id : null,
    dealerName: typeof row.dealer_name === "string" ? row.dealer_name : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
  };
}

export async function fetchPublicParcaciListings(
  supabase: SupabaseClient,
  limit = 24
): Promise<ParcaciListingCardItem[]> {
  const baseQuery = () =>
    supabase
      .from("parcaci_listings")
      .select(
        "id,title,description,price,image_url,cover_image_url,image,photo_url,thumbnail_url,condition,part_condition,condition_status,product_condition,city_name,dealer_id,dealer_name,created_at,is_active"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

  let data: Record<string, unknown>[] | null = null;
  const withActive = await baseQuery().eq("is_active", true);
  if (withActive.error) {
    const fallback = await baseQuery();
    if (fallback.error) {
      console.error("fetchPublicParcaciListings error:", fallback.error);
      return [];
    }
    data = (fallback.data ?? []) as Record<string, unknown>[];
  } else {
    data = (withActive.data ?? []) as Record<string, unknown>[];
  }

  return data.map(toCardItem).filter((item) => item.id);
}

export async function fetchPublicParcaciListingById(
  supabase: SupabaseClient,
  id: string
): Promise<ParcaciListingCardItem | null> {
  const { data, error } = await supabase
    .from("parcaci_listings")
    .select(
      "id,title,description,price,image_url,cover_image_url,image,photo_url,thumbnail_url,condition,part_condition,condition_status,product_condition,city_name,dealer_id,dealer_name,created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("fetchPublicParcaciListingById error:", error);
    return null;
  }
  if (!data) return null;
  return toCardItem(data as Record<string, unknown>);
}

export async function fetchParcaciDealerCoverById(
  supabase: SupabaseClient,
  supabaseUrl: string,
  dealerId: string | null
): Promise<string | null> {
  if (!dealerId) return null;
  const { data, error } = await supabase
    .from("parcaci_dealers")
    .select(
      "id,dealer_name,contact_phone,description,city_id,is_active,approved_at,bayi_applications(workplace_photos_json,signboard_photo_storage_path,status,payment_status,membership_expires_at)"
    )
    .eq("id", dealerId)
    .maybeSingle();

  if (error || !data) return null;
  return resolveDealerCoverImageUrl(data as DealerProfile, supabaseUrl);
}
