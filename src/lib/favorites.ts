import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function getSessionAndFavoriteSet(
  supabase: SupabaseClient,
  listingIds: (string | undefined)[]
): Promise<{ user: User | null; favoriteIds: Set<string> }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ids = [...new Set(listingIds.filter(Boolean) as string[])];
  if (!user || ids.length === 0) {
    return { user, favoriteIds: new Set() };
  }

  const { data, error } = await supabase
    .from("user_favorites")
    .select("listing_id")
    .eq("user_id", user.id)
    .in("listing_id", ids);

  if (error) {
    console.warn("user_favorites batch:", error.message);
    return { user, favoriteIds: new Set() };
  }

  const favoriteIds = new Set(
    (data ?? []).map((r: { listing_id: string }) => r.listing_id)
  );
  return { user, favoriteIds };
}
