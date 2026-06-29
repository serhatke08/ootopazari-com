import { computeFeatureBoostListingUpdate } from "@/lib/apply-feature-boost";
import { verifyPaytrCallbackHash, tryGetPaytrConfig } from "@/lib/paytr";
import { parseFeatureBoostMerchantOid } from "@/lib/paytr-merchant-oid";
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

  const { data: existing } = await admin
    .from("feature_boost_payments")
    .select("status,listing_id,pack_days")
    .eq("merchant_oid", merchantOid)
    .maybeSingle();

  if (existing?.status === "paid") {
    return new Response("OK");
  }

  if (status !== "success") {
    if (existing) {
      await admin
        .from("feature_boost_payments")
        .update({
          status: "failed",
          paytr_status: status,
          total_amount_kurus: Number(totalAmount) || null,
        })
        .eq("merchant_oid", merchantOid);
    }
    return new Response("OK");
  }

  let listingId = existing?.listing_id as string | undefined;
  let packDays = Number(existing?.pack_days);

  if (!listingId || !packDays) {
    const parsed = parseFeatureBoostMerchantOid(merchantOid);
    if (!parsed) {
      return new Response("OK");
    }
    packDays = parsed.packDays;
    const { data: listing } = await admin
      .from("listings")
      .select("id")
      .eq("listing_number", parsed.listingNumber)
      .maybeSingle();
    listingId = listing?.id as string | undefined;
  }

  if (!listingId || !packDays) {
    return new Response("OK");
  }

  const boostUpdate = computeFeatureBoostListingUpdate(packDays);
  const { error: listingErr } = await admin
    .from("listings")
    .update(boostUpdate)
    .eq("id", listingId);

  if (listingErr) {
    console.error("feature_boost callback listing update:", listingErr.message);
    return new Response("UPDATE FAILED", { status: 500 });
  }

  if (existing) {
    await admin
      .from("feature_boost_payments")
      .update({
        status: "paid",
        paytr_status: status,
        total_amount_kurus: Number(totalAmount) || null,
        paid_at: new Date().toISOString(),
      })
      .eq("merchant_oid", merchantOid);
  }

  return new Response("OK");
}
