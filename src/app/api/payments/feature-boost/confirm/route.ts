import { NextResponse } from "next/server";
import { fulfillFeatureBoostPayment } from "@/lib/feature-boost-payment";
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

  const result = await fulfillFeatureBoostPayment(admin, {
    merchantOid,
    userId: user.id,
    totalAmountKurus: statusResult.paymentAmountKurus,
    paytrStatus: "success",
  });

  if (!result.ok) {
    const messages: Record<string, string> = {
      forbidden: "Bu ödeme size ait değil.",
      listing_not_found: "İlan bulunamadı.",
      invalid_merchant_oid: "Geçersiz sipariş numarası.",
      listing_update_failed: "Paket ilana yazılamadı.",
      invalid_pack: "Geçersiz paket.",
      rpc_not_deployed:
        "Ödeme alındı ancak veritabanı güncellemesi eksik. Lütfen destek ile iletişime geçin.",
      rpc_failed: "Paket ilana yazılamadı.",
      listing_not_approved: "İlan onaylı değil; öne çıkarma uygulanamadı.",
    };
    return NextResponse.json(
      {
        ok: false,
        message: messages[result.reason] ?? "Paket tanımlanamadı.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyApplied: result.alreadyApplied,
    packDays: result.packDays,
    listingId: result.listingId,
    listingCount: result.listingCount,
    message: result.alreadyApplied
      ? result.listingCount > 1
        ? "Paketler zaten aktif."
        : "Paket zaten aktif."
      : result.listingCount > 1
        ? `${result.listingCount} ilana ${result.packDays} günlük öne çıkarma paketi tanımlandı.`
        : `${result.packDays} günlük öne çıkarma paketi ilanınıza tanımlandı.`,
  });
}
