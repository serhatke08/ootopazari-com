import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildFeatureBoostPaytrTransactionId,
  parseFeatureBoostMerchantOid,
} from "@/lib/paytr-merchant-oid";
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
  | {
      ok: true;
      listingId: string;
      packDays: number;
      listingCount: number;
      alreadyApplied: boolean;
    }
  | { ok: false; reason: string };

type PaymentItem = {
  listing_id: string;
  listing_number: string;
  pack_days: number;
};

type RpcBoostResult = {
  ok?: boolean;
  already_applied?: boolean;
  error?: string;
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

async function loadPaymentItems(
  admin: SupabaseClient,
  merchantOid: string
): Promise<PaymentItem[]> {
  const { data } = await admin
    .from("feature_boost_payment_items")
    .select("listing_id,listing_number,pack_days")
    .eq("merchant_oid", merchantOid);

  if (!data?.length) return [];

  return data.map((row) => ({
    listing_id: String(row.listing_id),
    listing_number: String(row.listing_number),
    pack_days: Number(row.pack_days),
  }));
}

async function applyFeatureBoostViaRpc(
  admin: SupabaseClient,
  input: {
    userId: string;
    listingId: string;
    transactionId: string;
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
    p_transaction_id: input.transactionId,
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
    return { ok: false, reason: result.error ?? "rpc_rejected" };
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

  const paymentItems = await loadPaymentItems(admin, merchantOid);

  if (paymentRow?.status === "paid") {
    const firstListingId =
      paymentItems[0]?.listing_id ?? String(paymentRow.listing_id ?? "");
    return {
      ok: true,
      listingId: firstListingId,
      packDays: Number(paymentRow.pack_days),
      listingCount: paymentItems.length || 1,
      alreadyApplied: true,
    };
  }

  let userId = input.userId ?? (paymentRow?.user_id as string | undefined);
  let packDays = input.packDays ?? Number(paymentRow?.pack_days);

  const targets: PaymentItem[] = paymentItems.length
    ? paymentItems
    : [];

  if (targets.length === 0) {
    let listingId =
      input.listingId ?? (paymentRow?.listing_id as string | undefined);

    if (!listingId || !packDays || packDays <= 0) {
      const parsed = parseFeatureBoostMerchantOid(merchantOid);
      if (!parsed) {
        return { ok: false, reason: "invalid_merchant_oid" };
      }
      packDays = parsed.packDays;
      if (parsed.kind === "single") {
        const listing = await findListingByNumber(admin, parsed.listingNumber);
        if (!listing) {
          return { ok: false, reason: "listing_not_found" };
        }
        listingId = listing.id;
        userId = userId ?? listing.user_id;
        targets.push({
          listing_id: listingId,
          listing_number: parsed.listingNumber,
          pack_days: packDays,
        });
      } else {
        return { ok: false, reason: "missing_payment_items" };
      }
    } else {
      const { data: listingRow } = await admin
        .from("listings")
        .select("listing_number,user_id")
        .eq("id", listingId)
        .maybeSingle();
      if (!listingRow?.listing_number) {
        return { ok: false, reason: "listing_not_found" };
      }
      userId = userId ?? String(listingRow.user_id);
      targets.push({
        listing_id: listingId,
        listing_number: String(listingRow.listing_number),
        pack_days: packDays,
      });
    }
  }

  if (!userId) {
    return { ok: false, reason: "missing_user" };
  }

  if (input.userId && input.userId !== userId) {
    return { ok: false, reason: "forbidden" };
  }

  let allAlreadyApplied = true;
  const usePerListingTx = targets.length > 1;
  for (const item of targets) {
    const transactionId = buildFeatureBoostPaytrTransactionId(
      merchantOid,
      item.listing_number,
      usePerListingTx
    );
    const rpcResult = await applyFeatureBoostViaRpc(admin, {
      userId,
      listingId: item.listing_id,
      transactionId,
      packDays: item.pack_days,
    });
    if (!rpcResult.ok) {
      return { ok: false, reason: rpcResult.reason };
    }
    if (!rpcResult.alreadyApplied) {
      allAlreadyApplied = false;
    }
  }

  const paidAt = new Date().toISOString();
  const amountKurus =
    input.totalAmountKurus ??
    Number(paymentRow?.amount_kurus) ??
    1;
  const firstTarget = targets[0];

  const paymentPayload = {
    merchant_oid: merchantOid,
    listing_id: firstTarget.listing_id,
    user_id: userId,
    pack_days: firstTarget.pack_days,
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
    listingId: firstTarget.listing_id,
    packDays: firstTarget.pack_days,
    listingCount: targets.length,
    alreadyApplied: allAlreadyApplied,
  };
}
