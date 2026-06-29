import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseFeatureBoostMerchantOid } from "@/lib/paytr-merchant-oid";
import {
  FEATURE_BOOST_HOURS_BETWEEN,
  featureBoostProductIdForPackDays,
} from "@/lib/listing-feature-boost";

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

type RpcBoostResult = {
  ok?: boolean;
  already_applied?: boolean;
  error?: string;
  listing_id?: string;
  days?: number;
};

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

async function applyFeatureBoostViaRpc(
  admin: SupabaseClient,
  input: {
    userId: string;
    listingId: string;
    merchantOid: string;
    packDays: number;
  }
): Promise<{ ok: true; alreadyApplied: boolean } | { ok: false; reason: string }> {
  const productId = featureBoostProductIdForPackDays(input.packDays);
  if (!productId) {
    return { ok: false, reason: "invalid_pack" };
  }

  const { data, error } = await admin.rpc("register_feature_boost_paytr_purchase", {
    p_user_id: input.userId,
    p_listing_id: input.listingId,
    p_product_id: productId,
    p_transaction_id: input.merchantOid,
    p_days: input.packDays,
    p_hours_between: FEATURE_BOOST_HOURS_BETWEEN,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("Could not find the function")) {
      console.error("register_feature_boost_paytr_purchase missing — run Supabase migration");
      return { ok: false, reason: "rpc_not_deployed" };
    }
    console.error("applyFeatureBoostViaRpc:", message);
    return { ok: false, reason: "rpc_failed" };
  }

  const result = (data ?? {}) as RpcBoostResult;
  if (!result.ok) {
    const rpcError = result.error ?? "rpc_rejected";
    return { ok: false, reason: rpcError };
  }

  return { ok: true, alreadyApplied: Boolean(result.already_applied) };
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

  if (!userId) {
    return { ok: false, reason: "missing_user" };
  }

  if (input.userId && input.userId !== userId) {
    return { ok: false, reason: "forbidden" };
  }

  const rpcResult = await applyFeatureBoostViaRpc(admin, {
    userId,
    listingId,
    merchantOid,
    packDays,
  });

  if (!rpcResult.ok) {
    return { ok: false, reason: rpcResult.reason };
  }

  const paidAt = new Date().toISOString();
  const amountKurus =
    input.totalAmountKurus ??
    Number(paymentRow?.amount_kurus) ??
    1;

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
    alreadyApplied: rpcResult.alreadyApplied,
  };
}
