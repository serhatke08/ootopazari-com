import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Universal-link köprüsü — layout/popup YOK (düz HTML).
 * App açılmazsa kullanıcı “Uygulamayı aç” görür; promo modal engellemez.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const ok =
    sp.get("ok") === "1" ||
    sp.get("eids") === "ok" ||
    sp.get("eids") === "1";
  const yetkiKodu = (sp.get("yetkiKodu") || "").trim();
  const durum = (sp.get("durum") || "").trim();
  const listingId = (sp.get("listingId") || "").trim();
  const state = (sp.get("state") || "").trim();
  const kullaniciKodu = (sp.get("kullaniciKodu") || "").trim();
  const apiHata = (sp.get("apiHata") || "").trim();

  const deepScheme =
    process.env.EIDS_APP_DEEP_LINK_SCHEME?.trim() || "otopazari://eids/result";
  const q = new URLSearchParams();
  if (yetkiKodu) q.set("yetkiKodu", yetkiKodu);
  if (durum) q.set("durum", durum);
  if (state) q.set("state", state);
  q.set("ok", ok ? "1" : "0");
  if (listingId) q.set("listingId", listingId);
  if (kullaniciKodu) q.set("kullaniciKodu", kullaniciKodu);
  if (apiHata) q.set("apiHata", apiHata);
  const sep = deepScheme.includes("?") ? "&" : "?";
  const deepHref = `${deepScheme}${sep}${q.toString()}`;

  const title = ok ? "Doğrulama tamamlandı" : "Doğrulama sonucu";
  const message = ok
    ? "E-Devlet doğrulaması alındı. Oto Pazarı uygulamasına yönlendiriliyorsunuz…"
    : "Doğrulama tamamlanamadı veya iptal edildi. Uygulamadan tekrar deneyebilirsiniz.";

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex,nofollow"/>
  <title>${title}</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:28rem;margin:3rem auto;padding:0 1rem;color:#18181b;line-height:1.45}
    a.btn{display:inline-flex;margin-top:1.25rem;background:#ffcc00;color:#18181b;font-weight:700;text-decoration:none;padding:.75rem 1rem;border-radius:.6rem}
    a.secondary{display:inline-block;margin-top:.75rem;color:#52525b;font-size:.9rem}
    code{font-size:.75rem;word-break:break-all;background:#f4f4f5;padding:.5rem .65rem;border-radius:.5rem;display:block;margin-top:1rem}
  </style>
  <script>setTimeout(function(){location.href=${JSON.stringify(deepHref)};},350);</script>
</head>
<body>
  <h1>${title}</h1>
  <p>${message}</p>
  ${yetkiKodu ? `<code>Yetki: ${yetkiKodu.replace(/[<>&]/g, "")}</code>` : ""}
  <p><a class="btn" href="${deepHref.replace(/"/g, "&quot;")}">Uygulamayı aç</a></p>
  <p><a class="secondary" href="/">Web ana sayfa</a></p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
