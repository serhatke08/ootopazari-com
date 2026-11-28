import { NextResponse } from "next/server";
import { getEidsReturnUrl } from "@/lib/eids";

export const dynamic = "force-dynamic";

const COOKIE = "eids_pending_state";
const COOKIE_JS = "eids_pending_state_js";
const COOKIE_MAX_AGE = 20 * 60; // 20 dk

function applyStateCookies(res: NextResponse, state: string) {
  res.cookies.set(COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  // JS okusun diye ayrı kopya — callback localStorage yoksa buradan alır.
  res.cookies.set(COOKIE_JS, state, {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * App/web → bu sayfa state’i cookie + localStorage’a yazar → Bakanlık oturumu.
 * Anlık 302 Chrome bounce-tracking ile cookie’yi siliyor; HTML ara sayfa şart.
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
  const returnUrl = getEidsReturnUrl();
  const ministry = new URL("https://eids.ticaret.gov.tr/oturum");
  ministry.searchParams.set("firmaKodu", firmaKodu);
  ministry.searchParams.set("returnUrl", returnUrl);
  const ministryHref = ministry.toString();
  const payload = JSON.stringify({ state, ministryHref });

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex,nofollow"/>
  <title>e-Devlet doğrulama</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:28rem;margin:3rem auto;padding:0 1rem;color:#18181b;line-height:1.45}
    a.btn{display:inline-flex;margin-top:1.25rem;background:#ffcc00;color:#18181b;font-weight:700;text-decoration:none;padding:.75rem 1rem;border-radius:.6rem}
    p.muted{color:#52525b;font-size:.9rem}
  </style>
  <script>
(function(){
  var p = ${payload};
  try { localStorage.setItem("eids_pending_state", p.state); } catch (e) {}
  try {
    document.cookie = "eids_pending_state_js=" + encodeURIComponent(p.state) +
      "; Max-Age=1200; Path=/; Secure; SameSite=Lax";
  } catch (e) {}
  function go(){ location.replace(p.ministryHref); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(go, 450); });
  } else {
    setTimeout(go, 450);
  }
})();
  </script>
</head>
<body>
  <h1>e-Devlet’e gidiliyor</h1>
  <p>Kimliğini doğrulamak için Ticaret Bakanlığı sayfası açılacak. Girişten sonra bu sekmeyi kapatma; uygulamaya kendiliğinden döneceksin.</p>
  <p class="muted">Açılmazsa sarı butona bas.</p>
  <p><a class="btn" href="${ministryHref.replace(/"/g, "&quot;")}">e-Devlet’i aç</a></p>
</body>
</html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
  applyStateCookies(res, state);
  return res;
}
