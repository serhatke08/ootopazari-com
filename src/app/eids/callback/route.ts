import { NextResponse } from "next/server";
import {
  buildEidsAppRedirectUrl,
  buildEidsWebRedirectPath,
  eidsDurumIsSuccess,
  getEidsReturnUrl,
  type EidsSessionRow,
} from "@/lib/eids";
import {
  callEidsAracYetki,
  callGetKullaniciKodu,
  normalizeGsmNo,
  normalizePlakaNo,
} from "@/lib/eids-ministry";
import { getSiteOrigin } from "@/lib/site-url";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function firstParam(sp: URLSearchParams, keys: string[]): string {
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

type AdminClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

/**
 * yetkiKodu 2 dk geçerli — callback içinde hemen GetKullaniciKodu + mümkünse Araç API.
 */
async function completeMinistryApis(
  admin: AdminClient,
  session: EidsSessionRow,
  yetkiKodu: string
): Promise<{
  kullaniciOk: boolean;
  aracOk: boolean;
  kullaniciKodu: string | null;
  kullaniciHata: string | null;
}> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, phone, eids_kullanici_kodu")
    .eq("id", session.user_id)
    .maybeSingle();

  const gsmNo = normalizeGsmNo(
    (profile as { phone?: string | null } | null)?.phone
  );

  let kullaniciKodu =
    (profile as { eids_kullanici_kodu?: string | null } | null)
      ?.eids_kullanici_kodu ?? null;
  let kullaniciOk = Boolean(kullaniciKodu);
  let kullaniciHata: string | null = null;
  let kullaniciAd: string | null = null;
  let kullaniciSoyad: string | null = null;

  if (!kullaniciKodu) {
    if (!gsmNo) {
      kullaniciHata = "gsm_missing";
    } else {
      try {
        const kk = await callGetKullaniciKodu({
          yetkiKodu,
          gsmNo,
        });
        kullaniciOk = kk.ok;
        kullaniciKodu = kk.kullaniciKodu;
        kullaniciAd = kk.ad ?? null;
        kullaniciSoyad = kk.soyad ?? null;
        kullaniciHata =
          kk.hataMesaji ||
          kk.hataKodu ||
          (kk.ok ? null : `http_${kk.httpStatus}`);

        if (kk.ok && kk.kullaniciKodu) {
          await admin
            .from("profiles")
            .update({
              eids_kullanici_kodu: kk.kullaniciKodu,
              eids_ad: kk.ad ?? null,
              eids_soyad: kk.soyad ?? null,
              eids_verified_at: new Date().toISOString(),
            })
            .eq("id", session.user_id);
        }
      } catch (e) {
        kullaniciHata =
          e instanceof Error ? e.message : "kullanici_kodu_failed";
      }
    }
  }

  let aracOk = false;
  let aracStatus: number | null = null;
  let aracErrors: string[] | null = null;
  let aracData: Record<string, unknown> | null = null;

  if (kullaniciKodu && session.listing_id) {
    const { data: listing } = await admin
      .from("listings")
      .select("id, vehicle_plate, listing_number")
      .eq("id", session.listing_id)
      .maybeSingle();

    const plakaNo = normalizePlakaNo(
      (listing as { vehicle_plate?: string | null } | null)?.vehicle_plate
    );
    const ilanNo =
      (listing as { listing_number?: number | string | null } | null)
        ?.listing_number != null
        ? String(
            (listing as { listing_number?: number | string | null })
              .listing_number
          )
        : session.listing_id;

    if (plakaNo) {
      try {
        const arac = await callEidsAracYetki({
          kullaniciKodu,
          plakaNo,
          ilanNo,
        });
        aracOk = arac.ok;
        aracStatus = arac.statusCode ?? arac.httpStatus;
        aracErrors = arac.errors ?? null;
        aracData = (arac.data as Record<string, unknown> | null) ?? null;

        if (arac.ok && arac.data) {
          await admin
            .from("listings")
            .update({
              eids_verified_at: new Date().toISOString(),
              eids_marka_adi: arac.data.markaAdi ?? null,
              eids_ticari_adi: arac.data.ticariAdi ?? null,
              eids_model_yili: arac.data.modelYili ?? null,
              eids_ilan_suresi: arac.data.ilanSuresi ?? null,
              eids_status: "verified",
              eids_errors: null,
            })
            .eq("id", session.listing_id);
        } else {
          await admin
            .from("listings")
            .update({
              eids_status: "failed",
              eids_errors: arac.errors ?? ["arac_yetki_failed"],
            })
            .eq("id", session.listing_id);
        }
      } catch (e) {
        aracErrors = [
          e instanceof Error ? e.message : "arac_yetki_failed",
        ];
        await admin
          .from("listings")
          .update({
            eids_status: "failed",
            eids_errors: aracErrors,
          })
          .eq("id", session.listing_id);
      }
    } else {
      aracErrors = ["plaka_missing"];
    }
  }

  await admin
    .from("eids_verification_sessions")
    .update({
      kullanici_kodu: kullaniciKodu,
      kullanici_ad: kullaniciAd,
      kullanici_soyad: kullaniciSoyad,
      kullanici_hata: kullaniciHata,
      arac_status_code: aracStatus,
      arac_errors: aracErrors,
      arac_data: aracData,
    })
    .eq("id", session.id);

  return {
    kullaniciOk,
    aracOk,
    kullaniciKodu,
    kullaniciHata,
  };
}

/**
 * EİDS Return URL (Bakanlık callback).
 * GET ?yetkiKodu=&durum=&state=
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
  if (
    session.status !== "pending" ||
    Number.isNaN(expiresAt) ||
    expiresAt < now
  ) {
    return htmlErrorPage(
      "Oturum süresi doldu",
      "Bu doğrulama linki artık geçerli değil. Yeni bir doğrulama başlatın."
    );
  }

  const edevletOk = eidsDurumIsSuccess(durum);
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
      status: edevletOk ? "completed" : "failed",
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

  const finalSession = (updated as EidsSessionRow | null) ?? session;

  let ministry = {
    kullaniciOk: false,
    aracOk: false,
    kullaniciKodu: null as string | null,
    kullaniciHata: null as string | null,
  };
  if (edevletOk) {
    try {
      ministry = await completeMinistryApis(admin, finalSession, yetkiKodu);
    } catch (e) {
      console.warn("eids ministry complete failed", e);
      ministry.kullaniciHata =
        e instanceof Error ? e.message : "ministry_failed";
    }
  }

  const overallOk = edevletOk && ministry.kullaniciOk;

  if (finalSession.source === "app") {
    const appUrl = buildEidsAppRedirectUrl({
      yetkiKodu,
      durum: overallOk
        ? durum || "ok"
        : ministry.kullaniciHata || durum || "fail",
      state: finalSession.state,
      listingId: finalSession.listing_id,
      ok: overallOk,
    });
    // Extra query for app diagnostics
    try {
      const u = new URL(appUrl);
      if (ministry.kullaniciKodu) {
        u.searchParams.set("kullaniciKodu", ministry.kullaniciKodu);
      }
      if (ministry.aracOk) u.searchParams.set("arac", "1");
      if (ministry.kullaniciHata) {
        u.searchParams.set("apiHata", ministry.kullaniciHata.slice(0, 120));
      }
      return NextResponse.redirect(u.toString(), 302);
    } catch {
      return NextResponse.redirect(appUrl, 302);
    }
  }

  const path = buildEidsWebRedirectPath({
    web_return_path: finalSession.web_return_path,
    listing_id: finalSession.listing_id,
    yetki_kodu: yetkiKodu,
    durum: overallOk ? durum : ministry.kullaniciHata || durum,
    state: finalSession.state,
    ok: overallOk,
  });
  const origin = getSiteOrigin();
  return NextResponse.redirect(new URL(path, origin), 302);
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "x-eids-return-url": getEidsReturnUrl(),
    },
  });
}
