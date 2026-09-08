import { NextResponse } from "next/server";
import {
  buildEidsAppRedirectUrl,
  buildEidsWebRedirectPath,
  eidsDurumIsSuccess,
  getEidsReturnUrl,
  type EidsSessionRow,
} from "@/lib/eids";
import { getSiteOrigin } from "@/lib/site-url";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function firstParam(
  sp: URLSearchParams,
  keys: string[]
): string {
  for (const k of keys) {
    const v = sp.get(k)?.trim();
    if (v) return v;
  }
  return "";
}

function htmlErrorPage(title: string, message: string): NextResponse {
  const body = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:28rem;margin:3rem auto;padding:0 1rem;color:#18181b}
    a{color:#065f46}
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${message}</p>
  <p><a href="/">Ana sayfaya dön</a></p>
</body>
</html>`;
  return new NextResponse(body, {
    status: 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/**
 * EİDS Return URL (Bakanlık callback).
 * GET ?yetkiKodu=&durum=&state=
 *
 * state yoksa son pending oturum yetkiKodu ile eşleştirilemez; state zorunluya yakın.
 * EİDS sabit URL’ye yalnızca yetkiKodu+durum gönderiyorsa, başlatırken
 * returnUrlWithState kullanın veya mobil/web state’i cookie’de tutun (web).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const yetkiKodu = firstParam(sp, [
    "yetkiKodu",
    "yetki_kodu",
    "YetkiKodu",
    "yetkikodu",
  ]);
  const durum = firstParam(sp, ["durum", "Durum", "status", "Status"]);
  const state = firstParam(sp, ["state", "State", "sid"]);

  if (!yetkiKodu) {
    return htmlErrorPage(
      "EİDS doğrulama",
      "yetkiKodu parametresi eksik. Doğrulamayı uygulamadan veya siteden yeniden başlatın."
    );
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return htmlErrorPage(
      "Sunucu yapılandırması",
      "EİDS oturumu kaydedilemedi. Lütfen daha sonra tekrar deneyin."
    );
  }

  let session: EidsSessionRow | null = null;

  if (state) {
    const { data, error } = await admin
      .from("eids_verification_sessions")
      .select(
        "id,state,user_id,listing_id,source,web_return_path,yetki_kodu,durum,status,created_at,expires_at,consumed_at"
      )
      .eq("state", state)
      .maybeSingle();
    if (error) {
      console.warn("eids callback state lookup:", error.message);
    }
    session = (data as EidsSessionRow | null) ?? null;
  }

  // State yok / bulunamadı: henüz kullanılmamış, süresi dolmamış, yetki_kodu boş son oturum yok —
  // güvenli eşleşme yapılamaz. Yine de yetkiKodu’yu loglayıp hata sayfası göster.
  if (!session) {
    console.warn("eids callback: session not found", {
      hasState: Boolean(state),
      yetkiKoduPrefix: yetkiKodu.slice(0, 8),
    });
    return htmlErrorPage(
      "Oturum bulunamadı",
      "Doğrulama oturumu geçersiz veya süresi dolmuş olabilir. Lütfen doğrulamayı yeniden başlatın."
    );
  }

  const now = Date.now();
  const expiresAt = new Date(session.expires_at).getTime();
  if (session.status !== "pending" || Number.isNaN(expiresAt) || expiresAt < now) {
    return htmlErrorPage(
      "Oturum süresi doldu",
      "Bu doğrulama linki artık geçerli değil. Yeni bir doğrulama başlatın."
    );
  }

  const ok = eidsDurumIsSuccess(durum);
  const callbackAt = new Date().toISOString();
  const queryPayload: Record<string, string> = {};
  for (const [k, v] of sp.entries()) {
    if (v != null && v !== "") queryPayload[k] = v;
  }

  const { data: updated, error: updateErr } = await admin
    .from("eids_verification_sessions")
    .update({
      yetki_kodu: yetkiKodu,
      durum: durum || null,
      status: ok ? "completed" : "failed",
      consumed_at: callbackAt,
      callback_at: callbackAt,
      callback_query: queryPayload,
    })
    .eq("id", session.id)
    .eq("status", "pending")
    .select(
      "id,state,user_id,listing_id,source,web_return_path,yetki_kodu,durum,status,created_at,expires_at,consumed_at"
    )
    .maybeSingle();

  if (updateErr) {
    console.warn("eids callback update:", updateErr.message);
    return htmlErrorPage(
      "Kayıt hatası",
      "Doğrulama sonucu kaydedilemedi. Destek ile iletişime geçin."
    );
  }

  // Eşzamanlı çift callback: ikinci istek pending bulamaz.
  const finalSession = (updated as EidsSessionRow | null) ?? session;
  if (!updated) {
    // Zaten işlenmiş — yine doğru yere yönlendir (idempotent UX).
  }

  if (finalSession.source === "app") {
    const appUrl = buildEidsAppRedirectUrl({
      yetkiKodu,
      durum,
      state: finalSession.state,
      listingId: finalSession.listing_id,
      ok,
    });
    return NextResponse.redirect(appUrl, 302);
  }

  const path = buildEidsWebRedirectPath({
    web_return_path: finalSession.web_return_path,
    listing_id: finalSession.listing_id,
    yetki_kodu: yetkiKodu,
    durum,
    state: finalSession.state,
    ok,
  });
  const origin = getSiteOrigin();
  return NextResponse.redirect(new URL(path, origin), 302);
}

/** Sağlık / dokümantasyon — Bakanlık kayıt kontrolü. */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "x-eids-return-url": getEidsReturnUrl(),
    },
  });
}
