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

export function listingCoverQualityScoreValue(listing: {
  cover_quality_score?: unknown;
}): number | null {
  const raw = listing.cover_quality_score;
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Düzenleme kaydında yönetici onayına (pending) gönder — mobil create_listing ile aynı. */
export function listingNeedsQualityResubmitOnEdit(listing: {
  moderation_status?: unknown;
  quality_passive_source?: unknown;
  cover_quality_score?: unknown;
}): boolean {
  const score = listingCoverQualityScoreValue(listing);
  if (score != null && score < 5) return true;

  const status = String(listing.moderation_status ?? "").toLowerCase();
  const passiveSource = String(listing.quality_passive_source ?? "").trim();
  return status === "suspended" && passiveSource === "algorithm";
}

/** Sahip paneli: kalite düzeltmesi admin onayı bekliyor. */
export function listingQualityResubmitPending(listing: {
  moderation_status?: unknown;
  quality_resubmit_at?: unknown;
}): boolean {
  if (String(listing.moderation_status ?? "").toLowerCase() !== "pending") {
    return false;
  }
  const at = listing.quality_resubmit_at;
  return at != null && String(at).trim() !== "";
}
