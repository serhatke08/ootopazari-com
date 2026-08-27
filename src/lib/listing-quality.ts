import type { SupabaseClient } from "@supabase/supabase-js";

/** Kayıt sonrası kalite değerlendirmesi — vitrin akışını bloklamaz. */
export async function evaluateListingQualityAfterSave(
  supabase: SupabaseClient,
  listingId: string,
  storageTable = "listings"
): Promise<void> {
  try {
    await supabase.rpc("evaluate_listing_quality", {
      p_listing_id: listingId,
      p_storage_table: storageTable,
      p_evaluated_by: "web",
    });
  } catch (err) {
    console.warn("evaluate_listing_quality:", err);
  }
}
