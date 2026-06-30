import { NextResponse } from "next/server";
import { fulfillBayiMembershipPayment } from "@/lib/bayi-membership-payment";
import { DEALER_TYPE_LABELS, type DealerType } from "@/lib/bayi-types";
import { formatFeatureBoostDate, parseListingDate } from "@/lib/listing-feature-boost";
import { queryPaytrPaymentStatus, tryGetPaytrConfig } from "@/lib/paytr";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Giriş yapmalısınız." },
      { status: 401 }
    );
  }

  let body: { merchantOid?: unknown };
  try {
    body = (await req.json()) as { merchantOid?: unknown };
  } catch {
    return NextResponse.json({ ok: false, message: "Geçersiz istek." }, { status: 400 });
  }

  const merchantOid =
    typeof body.merchantOid === "string" ? body.merchantOid.trim() : "";
  if (!merchantOid) {
    return NextResponse.json(
      { ok: false, message: "Sipariş numarası eksik." },
      { status: 400 }
    );
  }

  const paytr = tryGetPaytrConfig();
  if (!paytr) {
    return NextResponse.json(
      { ok: false, message: "Ödeme altyapısı yapılandırılmamış." },
      { status: 503 }
    );
  }

  const statusResult = await queryPaytrPaymentStatus(paytr, merchantOid);
  if (!statusResult.ok) {
    return NextResponse.json(
      { ok: false, message: "Ödeme henüz onaylanmamış veya bulunamadı." },
      { status: 402 }
    );
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, message: "Sunucu yapılandırması eksik." },
      { status: 500 }
    );
  }

  const result = await fulfillBayiMembershipPayment(admin, {
    merchantOid,
    userId: user.id,
    totalAmountKurus: statusResult.paymentAmountKurus,
    paytrStatus: "success",
  });

  if (!result.ok) {
    const messages: Record<string, string> = {
      forbidden: "Bu ödeme size ait değil.",
      application_not_found: "Bayi başvurusu bulunamadı.",
      application_not_approved: "Bayi başvurunuz onaylı değil.",
      application_update_failed: "Üyelik güncellenemedi.",
      missing_payment_record: "Ödeme kaydı bulunamadı.",
    };
    if (result.detail) {
      console.warn("bayi-membership confirm detail:", result.detail);
    }
    return NextResponse.json(
      {
        ok: false,
        message:
          messages[result.reason] ??
          (result.detail
            ? `Üyelik tanımlanamadı: ${result.detail}`
            : "Üyelik tanımlanamadı."),
      },
      { status: 400 }
    );
  }

  const expiresLabel = formatFeatureBoostDate(
    parseListingDate(result.membershipExpiresAt)
  );
  const dealerLabel = DEALER_TYPE_LABELS[result.dealerType as DealerType];

  return NextResponse.json({
    ok: true,
    alreadyApplied: result.alreadyApplied,
    dealerType: result.dealerType,
    membershipExpiresAt: result.membershipExpiresAt,
    message: `${dealerLabel} bayi üyeliğiniz aktifleştirildi. Ödemeniz için teşekkür ederiz${expiresLabel ? ` · Bitiş: ${expiresLabel}` : ""}.`,
  });
}
