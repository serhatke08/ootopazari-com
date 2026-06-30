import { NextResponse } from "next/server";
import { FEATURE_BOOST_PACKS } from "@/lib/listing-feature-boost";
import { isListingSuspended } from "@/lib/listings-data";
import {
  buildFeatureBoostMerchantOid,
  buildMultiFeatureBoostMerchantOid,
} from "@/lib/paytr-merchant-oid";
import { getRequestOrigin } from "@/lib/request-origin";
import { createPaytrIframeToken, tryGetPaytrConfig } from "@/lib/paytr";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  findReusablePendingBoostPayment,
  supersedePendingBoostPayments,
} from "@/lib/feature-boost-payment";

const MAX_LISTINGS_PER_CHECKOUT = 20;

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }
  return "127.0.0.1";
}

function parseListingIds(body: {
  listingId?: unknown;
  listingIds?: unknown;
}): string[] {
  if (Array.isArray(body.listingIds)) {
    const ids = body.listingIds
      .filter((id): id is string => typeof id === "string")
      .map((id) => id.trim())
      .filter(Boolean);
    return [...new Set(ids)];
  }
  if (typeof body.listingId === "string" && body.listingId.trim()) {
    return [body.listingId.trim()];
  }
  return [];
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

  let body: { listingId?: unknown; listingIds?: unknown; productId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Geçersiz istek." }, { status: 400 });
  }

  const listingIds = parseListingIds(body);
  const productId =
    typeof body.productId === "string" ? body.productId.trim() : "";

  if (listingIds.length === 0 || !productId) {
    return NextResponse.json(
      { ok: false, message: "En az bir ilan ve paket seçimi zorunludur." },
      { status: 400 }
    );
  }

  if (listingIds.length > MAX_LISTINGS_PER_CHECKOUT) {
    return NextResponse.json(
      {
        ok: false,
        message: `Tek seferde en fazla ${MAX_LISTINGS_PER_CHECKOUT} ilan seçebilirsiniz.`,
      },
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

  const { data: listings, error: listingsErr } = await supabase
    .from("listings")
    .select(
      "id,listing_number,title,user_id,moderation_status,suspension_reason,suspended_at"
    )
    .in("id", listingIds);

  if (listingsErr || !listings?.length) {
    return NextResponse.json(
      { ok: false, message: "İlan bulunamadı." },
      { status: 404 }
    );
  }

  if (listings.length !== listingIds.length) {
    return NextResponse.json(
      { ok: false, message: "Seçilen ilanlardan biri bulunamadı." },
      { status: 404 }
    );
  }

  const validated: {
    id: string;
    listingNumber: string;
    title: string;
  }[] = [];

  for (const listing of listings) {
    if (String(listing.user_id) !== user.id) {
      return NextResponse.json(
        { ok: false, message: "Seçilen ilanlardan biri size ait değil." },
        { status: 403 }
      );
    }

    const status = String(listing.moderation_status ?? "").toLowerCase();
    if (status !== "approved") {
      return NextResponse.json(
        {
          ok: false,
          message: "Yalnızca onaylı ilanlar öne çıkarılabilir.",
        },
        { status: 400 }
      );
    }

    if (isListingSuspended(listing)) {
      return NextResponse.json(
        { ok: false, message: "Askıya alınmış ilan öne çıkarılamaz." },
        { status: 400 }
      );
    }

    const listingNumber = String(listing.listing_number ?? "").trim();
    if (!listingNumber) {
      return NextResponse.json(
        { ok: false, message: "Geçersiz ilan numarası." },
        { status: 400 }
      );
    }

    validated.push({
      id: String(listing.id),
      listingNumber,
      title: String(listing.title ?? "İlan").trim() || "İlan",
    });
  }

  const paytr = tryGetPaytrConfig();
  if (!paytr) {
    return NextResponse.json(
      {
        ok: false,
        code: "paytr_not_configured",
        message: "Ödeme altyapısı şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
      },
      { status: 503 }
    );
  }

  const email = user.email?.trim() || "musteri@otopazari.com";
  const isMulti = validated.length > 1;
  const origin = getRequestOrigin(req);
  const unitPriceKurus = Math.round(pack.fallbackPriceTry * 100);
  const paymentAmountKurus = unitPriceKurus * validated.length;
  const basket = validated.map((listing) => [
    `İlan öne çıkarma · ${pack.label} · #${listing.listingNumber}`,
    pack.fallbackPriceTry.toFixed(2),
    1,
  ]) as [string, string, number][];

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, message: "Ödeme kaydı oluşturulamadı. Sunucu yapılandırmasını kontrol edin." },
      { status: 500 }
    );
  }

  let merchantOid = isMulti
    ? buildMultiFeatureBoostMerchantOid(validated.length, pack.days)
    : buildFeatureBoostMerchantOid(validated[0].listingNumber, pack.days);
  let reusePayment = false;

  if (!isMulti) {
    const reusable = await findReusablePendingBoostPayment(
      admin,
      user.id,
      validated[0].id,
      pack.days
    );
    if (reusable) {
      merchantOid = reusable;
      reusePayment = true;
    }
  }

  if (!reusePayment) {
    await supersedePendingBoostPayments(
      admin,
      user.id,
      validated.map((l) => l.id)
    );
    merchantOid = isMulti
      ? buildMultiFeatureBoostMerchantOid(validated.length, pack.days)
      : buildFeatureBoostMerchantOid(validated[0].listingNumber, pack.days);

    const { error: orderErr } = await admin.from("feature_boost_payments").insert({
      merchant_oid: merchantOid,
      listing_id: validated[0].id,
      user_id: user.id,
      pack_days: pack.days,
      amount_kurus: paymentAmountKurus,
      status: "pending",
    });
    if (orderErr) {
      console.error("feature_boost_payments insert:", orderErr.message);
      return NextResponse.json(
        { ok: false, message: "Ödeme kaydı oluşturulamadı. Lütfen tekrar deneyin." },
        { status: 500 }
      );
    }

    if (isMulti) {
      const { error: itemsErr } = await admin
        .from("feature_boost_payment_items")
        .insert(
          validated.map((listing) => ({
            merchant_oid: merchantOid,
            listing_id: listing.id,
            listing_number: listing.listingNumber,
            pack_days: pack.days,
          }))
        );
      if (itemsErr) {
        console.error("feature_boost_payment_items insert:", itemsErr.message);
        return NextResponse.json(
          { ok: false, message: "Ödeme kalemleri oluşturulamadı. Lütfen tekrar deneyin." },
          { status: 500 }
        );
      }
    }
  }

  const tokenResult = await createPaytrIframeToken(paytr, {
    userIp: clientIp(req),
    merchantOid,
    email,
    paymentAmountKurus,
    basket,
    okUrl: `${origin}/odeme/basarili?type=feature_boost&oid=${encodeURIComponent(merchantOid)}`,
    failUrl: `${origin}/odeme/basarisiz?type=feature_boost`,
    userName: email.split("@")[0] || "Müşteri",
    userAddress: "Türkiye",
    userPhone: "05000000000",
  });

  if (!tokenResult.ok) {
    return NextResponse.json(
      { ok: false, message: tokenResult.reason },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    token: tokenResult.token,
    merchantOid,
    listingCount: validated.length,
  });
}
