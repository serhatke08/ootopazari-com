import type { SupabaseClient } from "@supabase/supabase-js";

export type ListingPublicStats = {
  listingId: string;
  favorites: number;
  views: number;
};

const CHUNK_IDS = 80;
const CHUNK_RPC = 40;

function pickViewCount(row: Record<string, unknown>): number {
  const v =
    row.view_count ??
    row.views_count ??
    row.total_views ??
    row.views;
  return Number(v) || 0;
}

/** `user_favorites` satırlarından ilan başına beğeni sayısı. */
async function fetchFavoriteCountsMap(
  supabase: SupabaseClient,
  ids: string[]
): Promise<{ map: Map<string, number>; ok: boolean }> {
  const out = new Map<string, number>();
  let ok = true;
  for (let i = 0; i < ids.length; i += CHUNK_IDS) {
    const chunk = ids.slice(i, i + CHUNK_IDS);
    const { data, error } = await supabase
      .from("user_favorites")
      .select("listing_id")
      .in("listing_id", chunk);

    if (error) {
      console.warn("user_favorites stats:", error.message);
      ok = false;
      continue;
    }
    for (const raw of data ?? []) {
      const row = raw as { listing_id?: string };
      if (row.listing_id == null) continue;
      const lid = String(row.listing_id);
      out.set(lid, (out.get(lid) ?? 0) + 1);
    }
  }
  return { map: out, ok };
}

function rowToStatsRpc(row: Record<string, unknown>): ListingPublicStats | null {
  const id =
    row.listing_id ?? row.listingId ?? row.id;
  if (id == null) return null;
  const fav =
    row.favorite_count ??
    row.favorites_count ??
    row.total_favorites ??
    row.favorites ??
    0;
  const views =
    row.view_count ??
    row.views_count ??
    row.total_views ??
    row.views ??
    0;
  return {
    listingId: String(id),
    favorites: Number(fav) || 0,
    views: Number(views) || 0,
  };
}

/**
 * Beğeni: `user_favorites` üzerinden gerçek sayım.
 * Görüntülenme: `listing_views` satır sayımı -> `get_listing_public_stats` RPC `view_count`.
 */
export async function fetchListingPublicStatsMap(
  supabase: SupabaseClient,
  listingIds: string[]
): Promise<Map<string, ListingPublicStats>> {
  const map = new Map<string, ListingPublicStats>();
  const unique = [...new Set(listingIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const { map: favMap, ok: favQueryOk } = await fetchFavoriteCountsMap(
    supabase,
    unique
  );

  const rpcFavById = new Map<string, number>();
  const rpcViewById = new Map<string, number>();

  for (let i = 0; i < unique.length; i += CHUNK_RPC) {
    const chunk = unique.slice(i, i + CHUNK_RPC);
    const { data, error } = await supabase.rpc("get_listing_public_stats", {
      listing_ids: chunk,
    });

    if (error) {
      continue;
    }

    const rows = Array.isArray(data) ? data : [];
    for (const raw of rows) {
      if (!raw || typeof raw !== "object") continue;
      const s = rowToStatsRpc(raw as Record<string, unknown>);
      if (!s) continue;
      rpcFavById.set(s.listingId, s.favorites);
      rpcViewById.set(s.listingId, s.views);
    }
  }

  for (const id of unique) {
    const favorites = favQueryOk
      ? (favMap.get(id) ?? 0)
      : (rpcFavById.get(id) ?? favMap.get(id) ?? 0);
    const views = rpcViewById.get(id) ?? 0;
    map.set(id, {
      listingId: id,
      favorites,
      views,
    });
  }

  return map;
}
