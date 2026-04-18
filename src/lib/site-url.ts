/**
 * Kanonik site kökü (metadata, sitemap, robots).
 *
 * Production: Vercel → Environment Variables → `NEXT_PUBLIC_SITE_URL`
 * örn. `https://otopazarı.com` veya punycode `https://xn--otopazar-9ub.com`
 *
 * Preview’da genelde boş bırakın; `VERCEL_URL` (.vercel.app) kullanılır.
 */
export function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
      ? raw
      : `https://${raw}`;
    try {
      const u = new URL(withProto);
      if (u.hostname) return `${u.protocol}//${u.host}`;
    } catch {
      /* ignore */
    }
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    if (host) return `https://${host}`;
  }

  return "http://localhost:3000";
}
