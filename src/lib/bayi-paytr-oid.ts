import "server-only";
import type { DealerType } from "@/lib/bayi-types";
import { getMonthlyFeeForType } from "@/lib/bayi-application-status";

const DEALER_OID_CODE: Record<DealerType, string> = {
  galeri: "1",
  parcaci: "2",
  kiralama: "3",
  expertiz: "4",
};

const OID_CODE_TO_DEALER: Record<string, DealerType> = {
  "1": "galeri",
  "2": "parcaci",
  "3": "kiralama",
  "4": "expertiz",
};

export type BayiMembershipPlan = "monthly" | "yearly";

const BAYI_MEMBERSHIP_PLAN_CODE: Record<BayiMembershipPlan, "M" | "Y"> = {
  monthly: "M",
  yearly: "Y",
};

const PLAN_CODE_TO_BAYI_MEMBERSHIP: Record<string, BayiMembershipPlan> = {
  M: "monthly",
  Y: "yearly",
};

export const BAYI_MEMBERSHIP_MONTHLY_DAYS = 30;
export const BAYI_MEMBERSHIP_YEARLY_DAYS = 360;
export const BAYI_MEMBERSHIP_YEARLY_DISCOUNT_RATE = 0.3;

/** Bayi üyelik: BM{dealerCode}{M|Y}T{timestamp} */
export function buildBayiMembershipMerchantOid(
  dealerType: DealerType,
  plan: BayiMembershipPlan = "monthly"
): string {
  const code = DEALER_OID_CODE[dealerType];
  const planCode = BAYI_MEMBERSHIP_PLAN_CODE[plan];
  const oid = `BM${code}${planCode}T${Date.now()}`;
  return oid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
}

export function isBayiMembershipMerchantOid(merchantOid: string): boolean {
  return /^BM[1-4](?:[MY])?T\d+$/i.test(merchantOid.trim());
}

export function isFeatureBoostMerchantOid(merchantOid: string): boolean {
  return /^FB/i.test(merchantOid.trim());
}

export function parseBayiMembershipMerchantOid(
  merchantOid: string
): { dealerType: DealerType; plan: BayiMembershipPlan } | null {
  const m = /^BM([1-4])([MY])?T\d+$/i.exec(merchantOid.trim());
  if (!m) return null;
  const dealerType = OID_CODE_TO_DEALER[m[1]];
  const planCode = (m[2] ?? "M").toUpperCase();
  const plan = PLAN_CODE_TO_BAYI_MEMBERSHIP[planCode] ?? "monthly";
  return dealerType ? { dealerType, plan } : null;
}

export function bayiMembershipDays(plan: BayiMembershipPlan): number {
  return plan === "yearly"
    ? BAYI_MEMBERSHIP_YEARLY_DAYS
    : BAYI_MEMBERSHIP_MONTHLY_DAYS;
}

export function bayiMembershipAmountKurus(
  dealerType: DealerType,
  plan: BayiMembershipPlan = "monthly"
): number {
  const monthly = getMonthlyFeeForType(dealerType);
  if (plan === "yearly") {
    const discounted = monthly * 12 * (1 - BAYI_MEMBERSHIP_YEARLY_DISCOUNT_RATE);
    return Math.round(discounted * 100);
  }
  return Math.round(monthly * 100);
}
