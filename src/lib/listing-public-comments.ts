import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchAdminProfilesByUserIds,
  publicDisplayNameWithAdmin,
  type AdminProfileRow,
} from "@/lib/admin-profile";
import { fetchProfilePublic } from "@/lib/listings-data";
import { sanitizeUserAvatarUrl } from "@/lib/oauth-avatar";

export type ListingPublicCommentRow = {
  id: string;
  listing_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type ListingPublicCommentView = ListingPublicCommentRow & {
  authorName: string;
  authorAvatarUrl: string | null;
  isSeller: boolean;
};

function profileDisplayName(
  profile: Record<string, unknown> | null,
  admin: AdminProfileRow | null
): string {
  return publicDisplayNameWithAdmin(profile, admin);
}

async function buildCommentViews(
  supabase: SupabaseClient,
  rows: ListingPublicCommentRow[],
  sellerUserId: string
): Promise<ListingPublicCommentView[]> {
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const [adminMap, ...profiles] = await Promise.all([
    fetchAdminProfilesByUserIds(supabase, userIds),
    ...userIds.map((id) => fetchProfilePublic(supabase, id)),
  ]);
  const profileMap = new Map<string, Record<string, unknown> | null>();
  userIds.forEach((id, i) => profileMap.set(id, profiles[i]));

  return rows.map((row) => {
    const profile = profileMap.get(row.user_id) ?? null;
    const admin = adminMap.get(row.user_id) ?? null;
    const avatarRaw =
      profile?.avatar_url != null ? String(profile.avatar_url) : null;
    return {
      ...row,
      authorName: profileDisplayName(profile, admin),
      authorAvatarUrl: sanitizeUserAvatarUrl(avatarRaw),
      isSeller: row.user_id === sellerUserId,
    };
  });
}

export async function fetchListingPublicComments(
  supabase: SupabaseClient,
  listingId: string,
  sellerUserId: string,
  limit = 80
): Promise<ListingPublicCommentView[]> {
  const { data, error } = await supabase
    .from("listing_public_comments")
    .select("id,listing_id,user_id,body,created_at")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.warn("listing_public_comments:", error.message);
    return [];
  }

  return buildCommentViews(
    supabase,
    (data ?? []) as ListingPublicCommentRow[],
    sellerUserId
  );
}

export async function enrichListingPublicComment(
  supabase: SupabaseClient,
  row: ListingPublicCommentRow,
  sellerUserId: string
): Promise<ListingPublicCommentView> {
  const [views] = await buildCommentViews(supabase, [row], sellerUserId);
  return views;
}
