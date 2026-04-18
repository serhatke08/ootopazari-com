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

/**
 * Her çağrıda `listing_views` tablosuna YENİ satır ekler.
 * Aynı kullanıcı aynı ilana 100 kez girerse 100 satır eklenir -> RPC view_count 100 artar.
 */
export async function incrementListingView(
  supabase: SupabaseClient,
  listingId: string,
  viewerId: string | null
): Promise<boolean> {
  const id = listingId.trim();
  if (!id) return false;

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

  return tryInsertViewRow(admin, payload);
}
