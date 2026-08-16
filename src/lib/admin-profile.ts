import type { SupabaseClient } from "@supabase/supabase-js";

/** İlan / profilde doğrulama rozeti (public klasörü). */
export const ADMIN_VERIFIED_BADGE_SRC =
  "/menu/kategori%20icon/pngwing.com.png";

export type AdminProfileRow = {
  user_id: string;
  display_name: string;
  email?: string;
};

function asAdminRow(data: unknown): AdminProfileRow | null {
  if (!data || typeof data !== "object") return null;
  const row = data as AdminProfileRow;
  if (!row.user_id) return null;
  return row;
}

/** Rozet / yetki: e-posta kolonu kilitliyse yine çalışır. */
export async function fetchAdminProfileByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<AdminProfileRow | null> {
  const full = await supabase
    .from("admin_profiles")
    .select("user_id,email,display_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (!full.error) {
    return asAdminRow(full.data);
  }

  const lite = await supabase
    .from("admin_profiles")
    .select("user_id,display_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (lite.error) {
    console.warn("admin_profiles:", lite.error.message);
    return null;
  }
  return asAdminRow(lite.data);
}

export async function fetchAdminProfilesByUserIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, AdminProfileRow>> {
  const map = new Map<string, AdminProfileRow>();
  if (userIds.length === 0) return map;
  const uniq = [...new Set(userIds.filter(Boolean))];
  if (uniq.length === 0) return map;

  const full = await supabase
    .from("admin_profiles")
    .select("user_id,email,display_name")
    .in("user_id", uniq);

  const rows = !full.error
    ? full.data
    : (
        await supabase
          .from("admin_profiles")
          .select("user_id,display_name")
          .in("user_id", uniq)
      ).data;

  if (full.error && !rows) {
    console.warn("admin_profiles batch:", full.error.message);
    return map;
  }

  for (const row of rows ?? []) {
    const r = asAdminRow(row);
    if (r) map.set(r.user_id, r);
  }
  return map;
}

/** Satıcı / profil görünen adı: admin tablosundaki ad varsa önceliklidir. */
export function publicDisplayNameWithAdmin(
  profile: Record<string, unknown> | null | undefined,
  admin: AdminProfileRow | null
): string {
  const fromAdmin = admin?.display_name != null ? String(admin.display_name).trim() : "";
  if (fromAdmin) return fromAdmin;
  if (!profile) return "Kullanıcı";
  const full = profile.full_name != null ? String(profile.full_name).trim() : "";
  const un = profile.username != null ? String(profile.username).trim() : "";
  return full || un || "Kullanıcı";
}
