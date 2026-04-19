/**
 * Google OAuth vb. sağlayıcının `avatar_url` / `picture` URL'lerini göstermeyiz;
 * yalnızca sitede yüklenen veya kendi storage yolunuz kullanılır.
 */
export function sanitizeUserAvatarUrl(
  url: string | null | undefined
): string | null {
  if (url == null) return null;
  const raw = String(url).trim();
  if (!raw) return null;
  if (/googleusercontent\.com/i.test(raw)) return null;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (host.endsWith(".googleusercontent.com")) return null;
  } catch {
    /* göreli yol vb. */
  }
  return raw;
}
