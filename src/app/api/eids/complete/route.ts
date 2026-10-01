import { NextResponse } from "next/server";
import {
  callEidsAracYetki,
  callGetKullaniciKodu,
  normalizeGsmNo,
  normalizePlakaNo,
} from "@/lib/eids-ministry";
import { eidsDurumIsSuccess, type EidsSessionRow } from "@/lib/eids";
import { resolveRequestUser } from "@/lib/supabase/request-user";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * App: Bakanlık state’siz döndüyse, telefonda saklanan state + yetkiKodu ile tamamla.
 * Body: { state, yetkiKodu, durum?, gsmNo? }
 */
export async function POST(req: Request) {
  const { user } = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    state?: unknown;
    yetkiKodu?: unknown;
    durum?: unknown;
    gsmNo?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const state = typeof body.state === "string" ? body.state.trim() : "";
  const yetkiKodu =
    typeof body.yetkiKodu === "string" ? body.yetkiKodu.trim() : "";
  const durum = typeof body.durum === "string" ? body.durum.trim() : "ok";
  const gsmOverride =
    typeof body.gsmNo === "string" ? body.gsmNo.trim() : "";

  if (!state || !yetkiKodu) {
    return NextResponse.json(
      { error: "missing_params", message: "state ve yetkiKodu gerekli." },
      { status: 400 }
    );
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }

  const { data: sessionRow, error } = await admin
    .from("eids_verification_sessions")
    .select(
      "id,state,user_id,listing_id,source,web_return_path,yetki_kodu,durum,status,created_at,expires_at,consumed_at"
    )
    .eq("state", state)
    .maybeSingle();

  if (error || !sessionRow) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  const session = sessionRow as EidsSessionRow;
  if (session.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, phone, eids_kullanici_kodu")
    .eq("id", user.id)
    .maybeSingle();

  let kullaniciKodu =
    (profile as { eids_kullanici_kodu?: string | null } | null)
      ?.eids_kullanici_kodu ?? null;

  // Zaten kullanici kodu varsa idempotent OK
  if (session.status === "completed" && session.yetki_kodu && kullaniciKodu) {
    return NextResponse.json({
      ok: true,
      listingId: session.listing_id,
      kullaniciKodu,
      alreadyCompleted: true,
    });
  }

  const expiresAt = new Date(session.expires_at).getTime();
  const sessionFresh =
    session.status === "pending" ||
    // yetki alındı ama GetKullaniciKodu başarısızdıysa kısa süre yeniden dene
    (session.status === "completed" && Boolean(session.yetki_kodu));

  if (
    !sessionFresh ||
    Number.isNaN(expiresAt) ||
    expiresAt < Date.now() - 60_000
  ) {
    return NextResponse.json({ error: "session_expired" }, { status: 410 });
  }

  const edevletOk = eidsDurumIsSuccess(durum) || Boolean(yetkiKodu);
  const callbackAt = new Date().toISOString();

  if (session.status === "pending") {
    await admin
      .from("eids_verification_sessions")
      .update({
        yetki_kodu: yetkiKodu,
        durum: durum || null,
        status: edevletOk ? "completed" : "failed",
        consumed_at: callbackAt,
        callback_at: callbackAt,
        callback_query: { yetkiKodu, durum, via: "app_complete" },
      })
      .eq("id", session.id)
      .eq("status", "pending");
  }

  let kullaniciHata: string | null = null;

  if (!kullaniciKodu && edevletOk) {
    const gsmNo =
      normalizeGsmNo(gsmOverride) ||
      normalizeGsmNo(
        (profile as { phone?: string | null } | null)?.phone
      );
    if (!gsmNo) {
      kullaniciHata = "gsm_missing";
    } else {
      try {
        const kk = await callGetKullaniciKodu({ yetkiKodu, gsmNo });
        if (kk.ok && kk.kullaniciKodu) {
          kullaniciKodu = kk.kullaniciKodu;
          await admin
            .from("profiles")
            .update({
              eids_kullanici_kodu: kk.kullaniciKodu,
              eids_ad: kk.ad ?? null,
              eids_soyad: kk.soyad ?? null,
              eids_verified_at: new Date().toISOString(),
            })
            .eq("id", user.id);
        } else {
          kullaniciHata =
            kk.hataMesaji || kk.hataKodu || `http_${kk.httpStatus}`;
        }
      } catch (e) {
        kullaniciHata =
          e instanceof Error ? e.message : "kullanici_kodu_failed";
      }
    }
  }

  // Plaka yetkisi (ilan bağlıysa)
  if (kullaniciKodu && session.listing_id) {
    const { data: listing } = await admin
      .from("listings")
      .select("id, vehicle_plate, listing_number")
      .eq("id", session.listing_id)
      .maybeSingle();
    const plakaNo = normalizePlakaNo(
      (listing as { vehicle_plate?: string | null } | null)?.vehicle_plate
    );
    if (plakaNo) {
      try {
        const arac = await callEidsAracYetki({
          kullaniciKodu,
          plakaNo,
          ilanNo: session.listing_id,
        });
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
        }
      } catch {
        /* plaka sonra lookup ile denenebilir */
      }
    }
  }

  const ok = edevletOk && Boolean(kullaniciKodu);
  return NextResponse.json({
    ok,
    listingId: session.listing_id,
    kullaniciKodu,
    error: ok ? null : kullaniciHata || "kullanici_failed",
    gsmHint: ok
      ? null
      : "Profil cep telefonu, e-Devlet hesabındaki telefonla aynı olmalı (5xxxxxxxxx).",
  });
}
