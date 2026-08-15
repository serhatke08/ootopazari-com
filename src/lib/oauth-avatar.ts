import type { User } from "@supabase/supabase-js";

/** Sitede yüklenen avatar; Google / Play fotoğraflarını gösterme. */
export function sanitizeUserAvatarUrl(
  url: string | null | undefined
): string | null {
  if (url == null) return null;
  const raw = String(url).trim();
  if (!raw || raw === "null" || raw === "undefined") return null;
  if (/googleusercontent\.com|ggpht\.com|google\.com\/a\//i.test(raw)) {
    return null;
  }
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (
      host.endsWith(".googleusercontent.com") ||
      host.endsWith(".ggpht.com")
    ) {
      return null;
    }
  } catch {
    /* göreli yol */
  }
  return raw;
}

/** Yalnızca sitede yüklenmiş metadata avatar’ı; Google `picture` yok. */
export function avatarUrlFromAuthUser(user: User): string | null {
  const m = user.user_metadata as Record<string, unknown> | undefined;
  if (!m) return null;
  if (typeof m.avatar_url === "string") {
    return sanitizeUserAvatarUrl(m.avatar_url);
  }
  return null;
}
