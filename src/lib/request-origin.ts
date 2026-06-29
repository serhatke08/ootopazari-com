import { getSiteOrigin } from "@/lib/site-url";

/** PayTR dönüş URL’leri için: ödeme hangi host’ta başladıysa oraya dön (localhost ≠ production). */
export function getRequestOrigin(req: Request): string {
  try {
    const origin = new URL(req.url).origin;
    if (origin && origin !== "null") return origin;
  } catch {
    /* ignore */
  }

  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    req.headers.get("host")?.trim();
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";

  if (host) {
    try {
      return new URL(`${proto}://${host}`).origin;
    } catch {
      /* ignore */
    }
  }

  return getSiteOrigin();
}
