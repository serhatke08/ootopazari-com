import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DealerType } from "@/lib/bayi-types";
import { getMonthlyFeeForType } from "@/lib/bayi-application-status";
import { parseBayiMembershipMerchantOid } from "@/lib/bayi-paytr-oid";

export const BAYI_MEMBERSHIP_DAYS = 30;

export type FulfillBayiMembershipInput = {
  merchantOid: string;
  userId?: string;
  totalAmountKurus?: number | null;
  paytrStatus?: string;
};

export type FulfillBayiMembershipResult =
  | {
      ok: true;
      dealerType: DealerType;
      membershipExpiresAt: string;
      alreadyApplied: boolean;
    }
  | { ok: false; reason: string; detail?: string };

export async function fulfillBayiMembershipPayment(
  admin: SupabaseClient,
  input: FulfillBayiMembershipInput
): Promise<FulfillBayiMembershipResult> {
  const merchantOid = input.merchantOid.trim();
  if (!merchantOid) {
    return { ok: false, reason: "merchant_oid_missing" };
  }

  const parsed = parseBayiMembershipMerchantOid(merchantOid);
  if (!parsed) {
    return { ok: false, reason: "invalid_merchant_oid" };
  }

  const { data: paymentRow } = await admin
    .from("bayi_membership_payments")
    .select(
      "status,application_id,user_id,dealer_type,amount_kurus,membership_days"
    )
    .eq("merchant_oid", merchantOid)
    .maybeSingle();

  if (paymentRow?.status === "paid") {
    const { data: app } = await admin
      .from("bayi_applications")
      .select("membership_expires_at")
      .eq("id", paymentRow.application_id)
      .maybeSingle();
    return {
      ok: true,
      dealerType: parsed.dealerType,
      membershipExpiresAt: String(app?.membership_expires_at ?? ""),
      alreadyApplied: true,
    };
  }

  let userId = input.userId ?? (paymentRow?.user_id as string | undefined);
  const dealerType =
    (paymentRow?.dealer_type as DealerType | undefined) ?? parsed.dealerType;
  const applicationId = paymentRow?.application_id as string | undefined;

  if (!applicationId || !userId) {
    return { ok: false, reason: "missing_payment_record" };
  }

  if (input.userId && input.userId !== userId) {
    return { ok: false, reason: "forbidden" };
  }

  const { data: application, error: appErr } = await admin
    .from("bayi_applications")
    .select(
      "id,user_id,dealer_type,status,payment_status,membership_starts_at,membership_expires_at,monthly_fee_amount"
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (appErr || !application) {
    return {
      ok: false,
      reason: "application_not_found",
      detail: appErr?.message,
    };
  }

  if (String(application.user_id) !== userId) {
    return { ok: false, reason: "forbidden" };
  }

  if (String(application.status) !== "approved") {
    return { ok: false, reason: "application_not_approved" };
  }

  const now = new Date();
  const membershipDays =
    Number(paymentRow?.membership_days) || BAYI_MEMBERSHIP_DAYS;
  const currentExpires = application.membership_expires_at
    ? new Date(String(application.membership_expires_at))
    : null;
  const extendFrom =
    currentExpires && currentExpires.getTime() > now.getTime()
      ? currentExpires
      : now;
  const newExpires = new Date(
    extendFrom.getTime() + membershipDays * 24 * 60 * 60 * 1000
  );
  const paidAt = now.toISOString();
  const monthlyFee = getMonthlyFeeForType(dealerType);

  const fullUpdatePayload = {
    payment_status: "paid",
    payment_paid_at: paidAt,
    membership_starts_at: application.membership_starts_at ?? paidAt,
    membership_expires_at: newExpires.toISOString(),
    monthly_fee_amount: monthlyFee,
    updated_at: paidAt,
  };

  const { error: updateErr } = await admin
    .from("bayi_applications")
    .update(fullUpdatePayload)
    .eq("id", applicationId);

  if (updateErr?.message) {
    console.warn(
      "fulfillBayiMembership full update failed, trying fallback:",
      updateErr.message
    );
    const { error: fallbackErr } = await admin
      .from("bayi_applications")
      .update({
        payment_status: "paid",
        membership_starts_at: application.membership_starts_at ?? paidAt,
        membership_expires_at: newExpires.toISOString(),
      })
      .eq("id", applicationId);
    if (fallbackErr) {
      console.error(
        "fulfillBayiMembership application update fallback:",
        fallbackErr.message
      );
      return {
        ok: false,
        reason: "application_update_failed",
        detail: fallbackErr.message,
      };
    }
  }

  const amountKurus =
    input.totalAmountKurus ??
    Number(paymentRow?.amount_kurus) ??
    Math.round(monthlyFee * 100);

  const { error: paymentErr } = await admin.from("bayi_membership_payments").upsert(
    {
      merchant_oid: merchantOid,
      application_id: applicationId,
      user_id: userId,
      dealer_type: dealerType,
      amount_kurus: amountKurus,
      membership_days: membershipDays,
      status: "paid",
      paytr_status: input.paytrStatus ?? "success",
      total_amount_kurus: input.totalAmountKurus ?? amountKurus,
      paid_at: paidAt,
    },
    { onConflict: "merchant_oid" }
  );

  if (paymentErr) {
    console.warn("fulfillBayiMembership payment upsert:", paymentErr.message);
  }

  return {
    ok: true,
    dealerType,
    membershipExpiresAt: newExpires.toISOString(),
    alreadyApplied: false,
  };
}
