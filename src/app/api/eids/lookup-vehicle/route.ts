import { NextResponse } from "next/server";
import {
  callEidsAracYetki,
  isEidsMinistryRateLimit,
  normalizePlakaNo,
} from "@/lib/eids-ministry";
import { resolveRequestUser } from "@/lib/supabase/request-user";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * İlan oluşmadan önce plaka + EİDS araç yetkisi / resmi kayıt eşleştirme.
 * Body: { plakaNo: string }
 * Önkoşul: profiles.eids_kullanici_kodu
 */
export async function POST(req: Request) {
  const { user } = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { plakaNo?: unknown; plaka?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      {
        error: "invalid_json",
        message: "İstek okunamadı. Sayfayı yenileyip tekrar dene.",
      },
      { status: 400 }
    );
  }

  const plakaRaw =
    typeof body.plakaNo === "string"
      ? body.plakaNo
      : typeof body.plaka === "string"
        ? body.plaka
        : "";
  const plakaNo = normalizePlakaNo(plakaRaw);
  if (!plakaNo) {
    return NextResponse.json(
      {
        error: "plaka_missing",
        message: "Geçerli bir plaka yaz (ör. 34ABC123).",
      },
      { status: 400 }
    );
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_config" }, { status: 500 });
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

  try {
    const arac = await callEidsAracYetki({
      kullaniciKodu,
      plakaNo,
    });

    if (arac.ok && arac.data) {
      return NextResponse.json({
        ok: true,
        plakaNo,
        data: arac.data,
      });
    }

    const errBlob = (arac.errors ?? []).join(" ");
    if (
      arac.statusCode === 429 ||
      arac.httpStatus === 429 ||
      isEidsMinistryRateLimit(errBlob, String(arac.statusCode ?? ""))
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "ministry_rate_limited",
          errors: arac.errors ?? ["İzin verilen istek sınırı aşıldı."],
          statusCode: 429,
          message:
            "Ticaret Bakanlığı EİDS kotası doldu (bizim limitimiz değil). Birkaç dakika bekleyip tek sefer dene; peş peşe basmak kotayı daha da eritir.",
          raw: arac.raw ?? null,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "arac_yetki_failed",
        errors: arac.errors,
        statusCode: arac.statusCode,
        message:
          (arac.errors && arac.errors[0]) ||
          "Plaka yetkisi alınamadı. Plakayı kontrol edip tekrar dene.",
        raw: arac.raw ?? null,
      },
      { status: 400 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "arac_yetki_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
