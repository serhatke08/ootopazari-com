import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeFeatureBoostListingUpdate } from "@/lib/apply-feature-boost";
import { parseFeatureBoostMerchantOid } from "@/lib/paytr-merchant-oid";

export type FulfillFeatureBoostInput = {
  merchantOid: string;
  listingId?: string;
  packDays?: number;
  userId?: string;
  totalAmountKurus?: number | null;
  paytrStatus?: string;
};

export type FulfillFeatureBoostResult =
  | { ok: true; listingId: string; packDays: number; alreadyApplied: boolean }
  | { ok: false; reason: string };

export async function findListingByNumber(
  admin: SupabaseClient,
  listingNumber: string
): Promise<{ id: string; user_id: string } | null> {
  const asNum = Number(listingNumber);
  if (Number.isFinite(asNum)) {
    const { data } = await admin
      .from("listings")
      .select("id,user_id")
      .eq("listing_number", asNum)
      .maybeSingle();
    if (data?.id) {
      return { id: String(data.id), user_id: String(data.user_id) };
    }
  }

  const { data } = await admin
    .from("listings")
    .select("id,user_id")
    .eq("listing_number", listingNumber)
    .maybeSingle();

  if (!data?.id) return null;
  return { id: String(data.id), user_id: String(data.user_id) };
}

/** PayTR ödemesi sonrası ilana paketi tanımlar (idempotent). */
export async function fulfillFeatureBoostPayment(
  admin: SupabaseClient,
  input: FulfillFeatureBoostInput
): Promise<FulfillFeatureBoostResult> {
  const merchantOid = input.merchantOid.trim();
  if (!merchantOid) {
    return { ok: false, reason: "merchant_oid_missing" };
  }

  const { data: paymentRow } = await admin
    .from("feature_boost_payments")
    .select("status,listing_id,pack_days,user_id,amount_kurus")
    .eq("merchant_oid", merchantOid)
    .maybeSingle();

  if (paymentRow?.status === "paid" && paymentRow.listing_id) {
    return {
      ok: true,
      listingId: String(paymentRow.listing_id),
      packDays: Number(paymentRow.pack_days),
      alreadyApplied: true,
    };
  }

  let listingId = input.listingId ?? (paymentRow?.listing_id as string | undefined);
  let packDays = input.packDays ?? Number(paymentRow?.pack_days);
  let userId = input.userId ?? (paymentRow?.user_id as string | undefined);

  if (!listingId || !packDays) {
    const parsed = parseFeatureBoostMerchantOid(merchantOid);
    if (!parsed) {
      return { ok: false, reason: "invalid_merchant_oid" };
    }
    packDays = parsed.packDays;
    const listing = await findListingByNumber(admin, parsed.listingNumber);
    if (!listing) {
      return { ok: false, reason: "listing_not_found" };
    }
    listingId = listing.id;
    userId = userId ?? listing.user_id;
  }

  if (!listingId || !packDays || packDays <= 0) {
    return { ok: false, reason: "missing_listing_or_pack" };
  }

  if (input.userId && userId && input.userId !== userId) {
    return { ok: false, reason: "forbidden" };
  }

  const boostUpdate = computeFeatureBoostListingUpdate(packDays);
  const { error: listingErr } = await admin
    .from("listings")
    .update(boostUpdate)
    .eq("id", listingId);

  if (listingErr) {
    console.error("fulfillFeatureBoostPayment listing update:", listingErr.message);
    return { ok: false, reason: "listing_update_failed" };
  }

  const paidAt = new Date().toISOString();
  const amountKurus =
    input.totalAmountKurus ??
    Number(paymentRow?.amount_kurus) ??
    1;

  if (!userId) {
    return { ok: false, reason: "missing_user" };
  }

  const paymentPayload = {
    merchant_oid: merchantOid,
    listing_id: listingId,
    user_id: userId,
    pack_days: packDays,
    amount_kurus: amountKurus,
    status: "paid" as const,
    paytr_status: input.paytrStatus ?? "success",
    total_amount_kurus: input.totalAmountKurus ?? amountKurus,
    paid_at: paidAt,
  };

  const { error: paymentErr } = await admin
    .from("feature_boost_payments")
    .upsert(paymentPayload, { onConflict: "merchant_oid" });

  if (paymentErr) {
    console.warn("fulfillFeatureBoostPayment payment upsert:", paymentErr.message);
  }

  return {
    ok: true,
    listingId,
    packDays,
    alreadyApplied: false,
  };
}
