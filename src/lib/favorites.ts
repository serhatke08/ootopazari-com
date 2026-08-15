import type { SupabaseClient, User } from "@supabase/supabase-js";

export type UserFavoriteFolder = {
  id: string;
  name: string;
  sort_order: number;
};

export async function fetchUserFavoriteFolders(
  supabase: SupabaseClient,
  userId: string
): Promise<UserFavoriteFolder[]> {
  const { data, error } = await supabase
    .from("user_favorite_folders")
    .select("id,name,sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("user_favorite_folders:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    name: String((row as { name?: string }).name ?? "").trim() || "Klasör",
    sort_order: Number((row as { sort_order?: number }).sort_order) || 0,
  }));
}

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
