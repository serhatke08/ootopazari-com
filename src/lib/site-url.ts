import "server-only";
import { headers } from "next/headers";

/** Ortam veya tam origin stringinden `https://host` (IDN → punycode). */
function parsePublicOrigin(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withProto.endsWith("/") ? withProto : `${withProto}/`);
    if (!u.hostname) return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/**
 * Kanonik site kökü (metadata, fallback).
 *
 * Production: Vercel → `NEXT_PUBLIC_SITE_URL` örn. `https://otopazarı.com`
 * Preview: genelde boş bırakın → `VERCEL_URL`
 */
export function getSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    const o = parsePublicOrigin(fromEnv);
    if (o) return o;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    if (host) {
      const o = parsePublicOrigin(`https://${host}`);
      if (o) return o;
    }
  }

  return "http://localhost:3000";
}

/**
 * Sitemap / robots için: önce `NEXT_PUBLIC_SITE_URL`, yoksa gelen isteğin host’u
 * (`x-forwarded-host`). Böylece özel domainde `*.vercel.app` yazılmaz; Search Console
 * ile uyumlu olur.
 */
export async function resolvePublicSiteOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    const o = parsePublicOrigin(fromEnv);
    if (o) return o;
  }

  const h = await headers();
  const rawHost = h.get("x-forwarded-host") ?? h.get("host");
  const host = rawHost?.split(",")[0]?.trim().split(":")[0];
  const rawProto = h.get("x-forwarded-proto") ?? "https";
  const proto = rawProto.split(",")[0]?.trim() || "https";

  if (host && host !== "localhost" && host !== "127.0.0.1") {
    const o = parsePublicOrigin(`${proto}://${host}`);
    if (o) return o;
  }

  return getSiteOrigin();
}
