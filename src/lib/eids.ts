import "server-only";
import { createHash, randomBytes } from "crypto";
import { getSiteOrigin } from "@/lib/site-url";

export const EIDS_SESSION_TTL_MS = 15 * 60 * 1000;

export type EidsSource = "app" | "web";

export type EidsSessionRow = {
  id: string;
  state: string;
  user_id: string;
  listing_id: string | null;
  source: EidsSource;
  web_return_path: string | null;
  yetki_kodu: string | null;
  durum: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
};

/** Bakanlığa bildirilecek sabit Return URL (query eklenmez). */
export function getEidsReturnUrl(): string {
  const override = process.env.EIDS_RETURN_URL?.trim();
  if (override) {
    try {
      const u = new URL(override);
      if (u.protocol === "https:" || u.hostname === "localhost") {
        return `${u.origin}${u.pathname}`.replace(/\/$/, "") || u.origin;
      }
    } catch {
      /* ignore */
    }
  }
  return `${getSiteOrigin()}/eids/callback`;
}

export function createEidsState(): string {
  return randomBytes(32).toString("base64url");
}

export function hashEidsState(state: string): string {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

export function isEidsSource(value: unknown): value is EidsSource {
  return value === "app" || value === "web";
}

/** Web dönüş yolu: yalnızca site-içi göreli path. */
export function sanitizeEidsWebReturnPath(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t.startsWith("/")) return null;
  if (t.startsWith("//") || t.includes("://")) return null;
  if (t.length > 512) return null;
  return t;
}

/**
 * App’e dönüş.
 * Öncelik: EIDS_APP_UNIVERSAL_LINK_BASE (https://…/app/eids)
 * Yoksa: EIDS_APP_DEEP_LINK_SCHEME (otopazari://eids/result)
 */
export function buildEidsAppRedirectUrl(params: {
  yetkiKodu: string;
  durum: string;
  state: string;
  listingId?: string | null;
  ok: boolean;
}): string {
  const q = new URLSearchParams();
  q.set("yetkiKodu", params.yetkiKodu);
  q.set("durum", params.durum);
  q.set("state", params.state);
  q.set("ok", params.ok ? "1" : "0");
  if (params.listingId) q.set("listingId", params.listingId);

  const universal = process.env.EIDS_APP_UNIVERSAL_LINK_BASE?.trim();
  if (universal) {
    try {
      const u = new URL(universal);
      for (const [k, v] of q) u.searchParams.set(k, v);
      return u.toString();
    } catch {
      /* fall through */
    }
  }

  const scheme =
    process.env.EIDS_APP_DEEP_LINK_SCHEME?.trim() || "otopazari://eids/result";
  const base = scheme.includes("://") ? scheme : `otopazari://${scheme}`;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${q.toString()}`;
}

export function buildEidsWebRedirectPath(session: {
  web_return_path: string | null;
  listing_id: string | null;
  yetki_kodu: string | null;
  durum: string | null;
  state: string;
  ok: boolean;
}): string {
  const q = new URLSearchParams();
  q.set("eids", session.ok ? "ok" : "fail");
  if (session.yetki_kodu) q.set("yetkiKodu", session.yetki_kodu);
  if (session.durum) q.set("durum", session.durum);
  q.set("state", session.state);

  const custom = sanitizeEidsWebReturnPath(session.web_return_path);
  if (custom) {
    const u = new URL(custom, "https://placeholder.local");
    for (const [k, v] of q) u.searchParams.set(k, v);
    return `${u.pathname}${u.search}`;
  }

  if (session.listing_id) {
    return `/ilan-duzenle/${session.listing_id}?${q.toString()}`;
  }

  return `/profil/ilanlarim?${q.toString()}`;
}

/** durum alanını başarı / başarısız olarak yorumla (Bakanlık değerleri değişebilir). */
export function eidsDurumIsSuccess(durum: string): boolean {
  const d = durum.trim().toLocaleLowerCase("tr");
  if (!d) return false;
  if (
    d === "1" ||
    d === "true" ||
    d === "ok" ||
    d === "basarili" ||
    d === "başarılı" ||
    d === "success" ||
    d === "onaylandi" ||
    d === "onaylandı" ||
    d === "dogrulandi" ||
    d === "doğrulandı"
  ) {
    return true;
  }
  if (
    d === "0" ||
    d === "false" ||
    d === "fail" ||
    d === "basarisiz" ||
    d === "başarısız" ||
    d === "iptal" ||
    d === "error" ||
    d === "red" ||
    d === "reddedildi"
  ) {
    return false;
  }
  // Bilinmeyen değer: yetkiKodu varsa tamamlanmış say, API aşamasında netleşir.
  return Boolean(durum.trim());
}
