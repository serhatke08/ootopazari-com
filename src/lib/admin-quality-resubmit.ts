import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAdminListingTable } from "@/lib/admin-api";

export type AdminQualityResubmitRow = {
  id: string;
  storage_table: string;
  listing_number: number | string | null;
  title: string | null;
  image_url: string | null;
  quality_resubmit_at: string | null;
  cover_quality_score: number | null;
  user_id: string | null;
};

function rowFromRpc(item: Record<string, unknown>): AdminQualityResubmitRow | null {
  const id = item.id != null ? String(item.id) : "";
  if (!id) return null;
  const scoreRaw = item.cover_quality_score;
  let coverScore: number | null = null;
  if (typeof scoreRaw === "number" && Number.isFinite(scoreRaw)) {
    coverScore = scoreRaw;
  } else if (scoreRaw != null) {
    const n = Number(scoreRaw);
    if (Number.isFinite(n)) coverScore = n;
  }
  return {
    id,
    storage_table: parseAdminListingTable(item.storage_table),
    listing_number:
      item.listing_number != null
        ? (item.listing_number as number | string)
        : null,
    title: item.title != null ? String(item.title) : null,
    image_url: item.image_url != null ? String(item.image_url) : null,
    quality_resubmit_at:
      item.quality_resubmit_at != null
        ? String(item.quality_resubmit_at)
        : null,
    cover_quality_score: coverScore,
    user_id: item.user_id != null ? String(item.user_id) : null,
  };
}

export async function fetchAdminQualityResubmitPending(
  supabase: SupabaseClient,
  limit = 50,
  offset = 0
): Promise<AdminQualityResubmitRow[]> {
  try {
    const { data, error } = await supabase.rpc(
      "admin_list_quality_resubmit_pending",
      { p_limit: limit, p_offset: offset }
    );
    if (error) {
      console.warn("admin_list_quality_resubmit_pending:", error.message);
      return [];
    }
    if (data == null || typeof data !== "object") return [];
    const payload = data as { ok?: boolean; items?: unknown };
    if (payload.ok !== true || !Array.isArray(payload.items)) return [];
    return payload.items
      .map((item) =>
        item && typeof item === "object"
          ? rowFromRpc(item as Record<string, unknown>)
          : null
      )
      .filter((row): row is AdminQualityResubmitRow => row != null);
  } catch (err) {
    console.warn("admin_list_quality_resubmit_pending:", err);
    return [];
  }
}

export async function approveAdminQualityResubmit(
  supabase: SupabaseClient,
  listingId: string,
  storageTable: string
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("admin_approve_quality_resubmit", {
    p_listing_id: listingId,
    p_storage_table: storageTable,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  if (data && typeof data === "object") {
    const row = data as { ok?: boolean; error?: string };
    return { ok: row.ok === true, error: row.error };
  }
  return { ok: false, error: "invalid_response" };
}

export async function rejectAdminQualityResubmit(
  supabase: SupabaseClient,
  listingId: string,
  storageTable: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = reason?.trim();
  const { data, error } = await supabase.rpc("admin_reject_quality_resubmit", {
    p_listing_id: listingId,
    p_storage_table: storageTable,
    p_reason: trimmed && trimmed.length > 0 ? trimmed : null,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  if (data && typeof data === "object") {
    const row = data as { ok?: boolean; error?: string };
    return { ok: row.ok === true, error: row.error };
  }
  return { ok: false, error: "invalid_response" };
}
