import { NextResponse } from "next/server";
import {
  callEidsAracYetki,
  normalizePlakaNo,
} from "@/lib/eids-ministry";
import { resolveRequestUser } from "@/lib/supabase/request-user";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Plaka üzerinden EİDS araç yetkisi (Sahibinden tarzı).
 * Body: { listingId: string }
 * Önkoşul: profilde eids_kullanici_kodu (e-Devlet + GetKullaniciKodu).
 */
export async function POST(req: Request) {
  const { user } = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { listingId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const listingId =
    typeof body.listingId === "string" ? body.listingId.trim() : "";
  if (!listingId) {
    return NextResponse.json({ error: "missing_listing_id" }, { status: 400 });
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }

  const { data: listing, error: listingErr } = await admin
    .from("listings")
    .select("id,user_id,vehicle_plate,listing_number,eids_verified_at")
    .eq("id", listingId)
    .maybeSingle();
  if (listingErr || !listing) {
    return NextResponse.json({ error: "listing_not_found" }, { status: 404 });
  }
  if (String((listing as { user_id?: string }).user_id) !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("eids_kullanici_kodu")
    .eq("id", user.id)
    .maybeSingle();
  const kullaniciKodu = (
    profile as { eids_kullanici_kodu?: string | null } | null
  )?.eids_kullanici_kodu;
  if (!kullaniciKodu) {
    return NextResponse.json(
      {
        error: "eids_user_not_verified",
        message:
          "Önce E-Devlet ile kimlik doğrulaması yapın (kullanıcı kodu yok).",
      },
      { status: 400 }
    );
  }

  const plakaNo = normalizePlakaNo(
    (listing as { vehicle_plate?: string | null }).vehicle_plate
  );
  if (!plakaNo) {
    return NextResponse.json(
      {
        error: "plaka_missing",
        message: "İlanda plaka yok. Plaka ekleyip tekrar deneyin.",
      },
      { status: 400 }
    );
  }

  const ilanNo =
    (listing as { listing_number?: number | string | null }).listing_number !=
    null
      ? String(
          (listing as { listing_number?: number | string | null })
            .listing_number
        )
      : listingId;

  try {
    const arac = await callEidsAracYetki({
      kullaniciKodu,
      plakaNo,
      ilanNo,
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
        .eq("id", listingId);

      return NextResponse.json({
        ok: true,
        plakaNo,
        data: arac.data,
      });
    }

    await admin
      .from("listings")
      .update({
        eids_status: "failed",
        eids_errors: arac.errors ?? ["arac_yetki_failed"],
      })
      .eq("id", listingId);

    return NextResponse.json(
      {
        ok: false,
        error: "arac_yetki_failed",
        errors: arac.errors,
        statusCode: arac.statusCode,
      },
      { status: 400 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "arac_yetki_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
