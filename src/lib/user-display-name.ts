import type { User } from "@supabase/supabase-js";

type ProfileLike = { full_name?: unknown } | null | undefined;

/**
 * Navbar / küçük alanlar: görünen isim.
 * Profil layout ile aynı öncelik: metadata ad/soyad → metadata full_name → `profiles.full_name` → e-posta @ öncesi.
 */
export function displayNameFromAuthUser(
  user: User,
  profile?: ProfileLike
): string {
  const m = user.user_metadata as Record<string, unknown> | undefined;
  let firstName =
    m && typeof m.first_name === "string" ? m.first_name.trim() || null : null;
  let lastName =
    m && typeof m.last_name === "string" ? m.last_name.trim() || null : null;

  const profileFull =
    profile?.full_name != null ? String(profile.full_name).trim() : "";
  if (!firstName && !lastName && profileFull) {
    const parts = profileFull.split(/\s+/).filter(Boolean);
    firstName = parts[0] ?? null;
    lastName = parts.slice(1).join(" ") || null;
  }

  const fromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fromParts) return fromParts;

  const fullMeta =
    m && typeof m.full_name === "string" ? m.full_name.trim() : "";
  if (fullMeta) return fullMeta;
  if (profileFull) return profileFull;

  const em = user.email?.trim();
  if (em) {
    const local = em.split("@")[0];
    if (local) return local;
  }
  return "Hesap";
}
