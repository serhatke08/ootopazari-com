import { NextResponse } from "next/server";
import { getEidsReturnUrl } from "@/lib/eids";

export const dynamic = "force-dynamic";

const COOKIE = "eids_pending_state";
const COOKIE_MAX_AGE = 20 * 60; // 20 dk

/**
 * App/web → bu route → cookie’ye state yaz → Bakanlık oturumu (sabit Return URL).
 * Bakanlık returnUrl’den ?state= düşürdüğü için state’i cookie ile taşıyoruz.
 *
 * GET /eids/go?state=...
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state")?.trim() ?? "";
  if (!state || state.length < 8) {
    return NextResponse.redirect(new URL("/", url.origin), 302);
  }

  const firmaKodu =
    process.env.EIDS_FIRMA_KODU?.trim() ||
    "728bd568-8fd8-4632-9207-83e0d6b0bb0f";
  // Bakanlığa KAYITLI sabit Return URL — query ekleme.
  const returnUrl = getEidsReturnUrl();
  const ministry = new URL("https://eids.ticaret.gov.tr/oturum");
  ministry.searchParams.set("firmaKodu", firmaKodu);
  ministry.searchParams.set("returnUrl", returnUrl);

  const res = NextResponse.redirect(ministry.toString(), 302);
  res.cookies.set(COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
