import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

type InsertPayload = {
  listing_id: string;
  viewer_id: string | null;
  viewed_at: string;
};

async function tryInsertViewRow(
  supabase: SupabaseClient,
  payload: InsertPayload
): Promise<boolean> {
  const { error } = await supabase.from("listing_views").insert(payload);
  return !error;
}

/** Pasif / süresi dolmuş / pazarda olmayan ilanda görüntülenme artmaz. */
async function listingCountsViews(
  supabase: SupabaseClient,
  listingId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("listings")
    .select("id, activation_status, moderation_status, exclude_from_marketplace")
    .eq("id", listingId)
    .maybeSingle();
  if (error || !data?.id) return false;
  const row = data as {
    activation_status?: string | null;
    moderation_status?: string | null;
    exclude_from_marketplace?: boolean | null;
  };
  if (String(row.activation_status ?? "").trim() !== "active") return false;
  if (row.exclude_from_marketplace === true) return false;
  const mod = row.moderation_status;
  if (mod != null && String(mod).trim() !== "" && String(mod) !== "approved") {
    return false;
  }
  return true;
}

/**
 * Önce oturum / RLS ile yazar. RLS engellerse yalnızca sayılacak (aktif) ilan için
 * service_role kullanır — pasif ilanda sayaç artmaz.
 */
export async function incrementListingView(
  supabase: SupabaseClient,
  listingId: string,
  viewerId: string | null
): Promise<boolean> {
  const id = listingId.trim();
  if (!id) return false;
  if (!(await listingCountsViews(supabase, id))) return false;

  const payload: InsertPayload = {
    listing_id: id,
    viewer_id: viewerId,
    viewed_at: new Date().toISOString(),
  };

  if (await tryInsertViewRow(supabase, payload)) return true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return false;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Service role ile de aynı kural (race / RLS sonrası)
  if (!(await listingCountsViews(admin, id))) return false;

  return tryInsertViewRow(admin, payload);
}
