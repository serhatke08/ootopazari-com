import { NextResponse } from "next/server";
import {
  normalizeDealerState,
} from "@/lib/bayi-application-status";
import {
  type BayiMembershipPlan,
  bayiMembershipAmountKurus,
  bayiMembershipDays,
  buildBayiMembershipMerchantOid,
} from "@/lib/bayi-paytr-oid";
import { DEALER_TYPES, DEALER_TYPE_LABELS, type DealerType } from "@/lib/bayi-types";
import { getRequestOrigin } from "@/lib/request-origin";
import { createPaytrIframeToken, tryGetPaytrConfig } from "@/lib/paytr";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

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

  let body: { dealerType?: unknown; plan?: unknown };
  try {
    body = (await req.json()) as { dealerType?: unknown; plan?: unknown };
  } catch {
    return NextResponse.json({ ok: false, message: "Geçersiz istek." }, { status: 400 });
  }

  const dealerType =
    typeof body.dealerType === "string" ? (body.dealerType.trim() as DealerType) : null;

  if (!dealerType || !DEALER_TYPES.includes(dealerType)) {
    return NextResponse.json(
      { ok: false, message: "Geçersiz bayi tipi." },
      { status: 400 }
    );
  }
  const planRaw = typeof body.plan === "string" ? body.plan.trim() : "monthly";
  const plan: BayiMembershipPlan = planRaw === "yearly" ? "yearly" : "monthly";

  const { data: application, error: appErr } = await supabase
    .from("bayi_applications")
    .select(
      "id,user_id,dealer_type,status,payment_status,membership_expires_at,dealer_name"
    )
    .eq("user_id", user.id)
    .eq("dealer_type", dealerType)
    .maybeSingle();

  if (appErr || !application) {
    return NextResponse.json(
      { ok: false, message: "Bayi başvurunuz bulunamadı." },
      { status: 404 }
    );
  }

  const dealerState = normalizeDealerState(
    application.status as "pending" | "approved" | "rejected",
    application.payment_status as "unpaid" | "awaiting_payment" | "paid" | "overdue",
    application.membership_expires_at as string | null
  );

  if (dealerState === "pending" || dealerState === "rejected") {
    return NextResponse.json(
      { ok: false, message: "Ödeme için onaylı bayi başvurusu gerekir." },
      { status: 400 }
    );
  }

  const paytr = tryGetPaytrConfig();
  if (!paytr) {
    return NextResponse.json(
      {
        ok: false,
        message: "Ödeme altyapısı şu an kullanılamıyor.",
      },
      { status: 503 }
    );
  }

  const membershipDays = bayiMembershipDays(plan);
  const paymentAmountKurus = bayiMembershipAmountKurus(dealerType, plan);
  const merchantOid = buildBayiMembershipMerchantOid(dealerType, plan);
  const origin = getRequestOrigin(req);
  const email = user.email?.trim() || "musteri@otopazari.com";
  const label = DEALER_TYPE_LABELS[dealerType];
  const basketName =
    plan === "yearly"
      ? `${label} bayi yıllık üyelik (${membershipDays} gün, %30 indirim)`
      : `${label} bayi aylık üyelik (${membershipDays} gün)`;

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, message: "Ödeme kaydı oluşturulamadı. Sunucu yapılandırmasını kontrol edin." },
      { status: 500 }
    );
  }

  const { error: orderErr } = await admin.from("bayi_membership_payments").insert({
    merchant_oid: merchantOid,
    application_id: application.id,
    user_id: user.id,
    dealer_type: dealerType,
    amount_kurus: paymentAmountKurus,
    membership_days: membershipDays,
    status: "pending",
  });
  if (orderErr) {
    console.error("bayi_membership_payments insert:", orderErr.message);
    return NextResponse.json(
      { ok: false, message: "Ödeme kaydı oluşturulamadı. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }

  const tokenResult = await createPaytrIframeToken(paytr, {
    userIp: clientIp(req),
    merchantOid,
    email,
    paymentAmountKurus,
    basket: [[basketName, (paymentAmountKurus / 100).toFixed(2), 1]],
    okUrl: `${origin}/odeme/basarili?type=bayi_membership&oid=${encodeURIComponent(merchantOid)}&dealerType=${encodeURIComponent(dealerType)}`,
    failUrl: `${origin}/odeme/basarisiz?type=bayi_membership&dealerType=${encodeURIComponent(dealerType)}`,
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

  return NextResponse.json({ ok: true, token: tokenResult.token, merchantOid });
}
