import { fulfillBayiMembershipPayment } from "@/lib/bayi-membership-payment";
import { fulfillFeatureBoostPayment } from "@/lib/feature-boost-payment";
import {
  isBayiMembershipMerchantOid,
  isFeatureBoostMerchantOid,
} from "@/lib/bayi-paytr-oid";
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

  const amountKurus = Number(totalAmount) || null;

  if (status !== "success") {
    if (isFeatureBoostMerchantOid(merchantOid)) {
      await admin
        .from("feature_boost_payments")
        .update({
          status: "failed",
          paytr_status: status,
          total_amount_kurus: amountKurus,
        })
        .eq("merchant_oid", merchantOid);
    } else if (isBayiMembershipMerchantOid(merchantOid)) {
      await admin
        .from("bayi_membership_payments")
        .update({
          status: "failed",
          paytr_status: status,
          total_amount_kurus: amountKurus,
        })
        .eq("merchant_oid", merchantOid);
    }
    return new Response("OK");
  }

  if (isBayiMembershipMerchantOid(merchantOid)) {
    const result = await fulfillBayiMembershipPayment(admin, {
      merchantOid,
      totalAmountKurus: amountKurus,
      paytrStatus: status,
    });
    if (!result.ok) {
      console.error("paytr callback bayi fulfill:", result.reason, merchantOid);
      return new Response("FULFILL FAILED", { status: 500 });
    }
    return new Response("OK");
  }

  if (isFeatureBoostMerchantOid(merchantOid)) {
    const result = await fulfillFeatureBoostPayment(admin, {
      merchantOid,
      totalAmountKurus: amountKurus,
      paytrStatus: status,
    });
    if (!result.ok) {
      console.error("paytr callback boost fulfill:", result.reason, merchantOid);
      return new Response("FULFILL FAILED", { status: 500 });
    }
    return new Response("OK");
  }

  console.warn("paytr callback unknown merchant_oid:", merchantOid);
  return new Response("OK");
}
