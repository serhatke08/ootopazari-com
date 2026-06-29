import { NextResponse } from "next/server";
import { FEATURE_BOOST_PACKS } from "@/lib/listing-feature-boost";
import { isListingSuspended } from "@/lib/listings-data";
import { createPaytrIframeToken, tryGetPaytrConfig } from "@/lib/paytr";
import { getSiteOrigin } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }
  return "127.0.0.1";
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Ödeme için giriş yapmalısınız." },
      { status: 401 }
    );
  }

  let body: { listingId?: unknown; productId?: unknown };
  try {
    body = (await req.json()) as { listingId?: unknown; productId?: unknown };
  } catch {
    return NextResponse.json({ ok: false, message: "Geçersiz istek." }, { status: 400 });
  }

  const listingId =
    typeof body.listingId === "string" ? body.listingId.trim() : "";
  const productId =
    typeof body.productId === "string" ? body.productId.trim() : "";

  if (!listingId || !productId) {
    return NextResponse.json(
      { ok: false, message: "İlan ve paket seçimi zorunludur." },
      { status: 400 }
    );
  }

  const pack = FEATURE_BOOST_PACKS.find((p) => p.productId === productId);
  if (!pack) {
    return NextResponse.json(
      { ok: false, message: "Geçersiz paket." },
      { status: 400 }
    );
  }

  const { data: listing, error: listingErr } = await supabase
    .from("listings")
    .select(
      "id,listing_number,title,user_id,moderation_status,suspension_reason,suspended_at,featured_until,featured_started_at,feature_boost_campaign_start_at,feature_boost_pack_days"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (listingErr || !listing) {
    return NextResponse.json(
      { ok: false, message: "İlan bulunamadı." },
      { status: 404 }
    );
  }

  if (String(listing.user_id) !== user.id) {
    return NextResponse.json(
      { ok: false, message: "Bu ilan size ait değil." },
      { status: 403 }
    );
  }

  const status = String(listing.moderation_status ?? "").toLowerCase();
  if (status !== "approved") {
    return NextResponse.json(
      { ok: false, message: "Yalnızca onaylı ilanlar öne çıkarılabilir." },
      { status: 400 }
    );
  }

  if (isListingSuspended(listing)) {
    return NextResponse.json(
      { ok: false, message: "Askıya alınmış ilan öne çıkarılamaz." },
      { status: 400 }
    );
  }

  const paytr = tryGetPaytrConfig();
  if (!paytr) {
    return NextResponse.json(
      {
        ok: false,
        code: "paytr_not_configured",
        message:
          "Ödeme altyapısı henüz yapılandırılmadı. PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY ve PAYTR_MERCHANT_SALT değerlerini ekleyin.",
      },
      { status: 503 }
    );
  }

  const email = user.email?.trim() || "musteri@otopazari.com";
  const listingNumber = String(listing.listing_number ?? "");
  const merchantOid = `FB${listingNumber}${Date.now()}`.slice(0, 64);
  const origin = getSiteOrigin();
  const paymentAmountKurus = Math.round(pack.fallbackPriceTry * 100);
  const basketName = `İlan öne çıkarma · ${pack.label} · #${listingNumber}`;

  const tokenResult = await createPaytrIframeToken(paytr, {
    userIp: clientIp(req),
    merchantOid,
    email,
    paymentAmountKurus,
    basket: [[basketName, paymentAmountKurus.toFixed(2), 1]],
    okUrl: `${origin}/odeme/basarili?type=feature_boost`,
    failUrl: `${origin}/odeme/basarisiz?type=feature_boost`,
    userName: email.split("@")[0] || "Müşteri",
    userAddress: "Türkiye",
    userPhone: "05000000000",
  });

  if (!tokenResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: tokenResult.reason,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    token: tokenResult.token,
    merchantOid,
  });
}
