import type { SupabaseClient } from "@supabase/supabase-js";

export const DUPLICATE_LIVE_LISTING_MESSAGE =
  "Aynı ilan zaten yayında. Tekrar yayınlanamaz.";

export function isDuplicateLiveListingError(message: string | undefined | null): boolean {
  if (!message) return false;
  return /aynı ilan zaten|listings_no_duplicate_live|duplicate key value/i.test(
    message
  );
}

export type LiveDuplicateLookup = {
  userId: string;
  title: string;
  price: number | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleMileage: number | null;
  categoryId: string | null;
  excludeListingId?: string | null;
};

export async function findLiveDuplicateListingId(
  supabase: SupabaseClient,
  lookup: LiveDuplicateLookup
): Promise<string | null> {
  const title = lookup.title.trim();
  if (!lookup.userId || !title) return null;

  let q = supabase
    .from("listings")
    .select("id")
    .eq("user_id", lookup.userId)
    .eq("title", title)
    .in("moderation_status", ["pending", "approved"])
    .limit(8);

  if (lookup.price != null) q = q.eq("price", lookup.price);
  if (lookup.vehicleModel) q = q.eq("vehicle_model", lookup.vehicleModel);
  if (lookup.vehicleYear != null) q = q.eq("vehicle_year", lookup.vehicleYear);
  if (lookup.vehicleMileage != null) q = q.eq("vehicle_mileage", lookup.vehicleMileage);
  if (lookup.categoryId) q = q.eq("category_id", lookup.categoryId);
  if (lookup.excludeListingId) q = q.neq("id", lookup.excludeListingId);

  const { data, error } = await q;
  if (error || !data?.length) return null;
  return String(data[0].id);
}
