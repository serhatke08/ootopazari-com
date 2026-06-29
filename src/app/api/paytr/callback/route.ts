import { fulfillFeatureBoostPayment } from "@/lib/feature-boost-payment";
import { verifyPaytrCallbackHash, tryGetPaytrConfig } from "@/lib/paytr";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const paytr = tryGetPaytrConfig();
  if (!paytr) {
    return new Response("PAYTR not configured", { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response("BAD REQUEST", { status: 400 });
  }

  const merchantOid = String(form.get("merchant_oid") ?? "").trim();
  const status = String(form.get("status") ?? "").trim();
  const totalAmount = String(form.get("total_amount") ?? "").trim();
  const hash = String(form.get("hash") ?? "").trim();

  if (!merchantOid || !status || !totalAmount || !hash) {
    return new Response("MISSING FIELDS", { status: 400 });
  }

  if (
    !verifyPaytrCallbackHash({
      merchantOid,
      status,
      totalAmount,
      hash,
      config: paytr,
    })
  ) {
    return new Response("INVALID HASH", { status: 403 });
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return new Response("SERVER CONFIG", { status: 500 });
  }

  if (status !== "success") {
    await admin
      .from("feature_boost_payments")
      .update({
        status: "failed",
        paytr_status: status,
        total_amount_kurus: Number(totalAmount) || null,
      })
      .eq("merchant_oid", merchantOid);
    return new Response("OK");
  }

  const result = await fulfillFeatureBoostPayment(admin, {
    merchantOid,
    totalAmountKurus: Number(totalAmount) || null,
    paytrStatus: status,
  });

  if (!result.ok) {
    console.error("paytr callback fulfill:", result.reason, merchantOid);
    return new Response("FULFILL FAILED", { status: 500 });
  }

  return new Response("OK");
}
