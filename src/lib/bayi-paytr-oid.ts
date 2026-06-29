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

/** Bayi üyelik: BM{dealerCode}T{timestamp} */
export function buildBayiMembershipMerchantOid(dealerType: DealerType): string {
  const code = DEALER_OID_CODE[dealerType];
  const oid = `BM${code}T${Date.now()}`;
  return oid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
}

export function isBayiMembershipMerchantOid(merchantOid: string): boolean {
  return /^BM[1-4]T\d+$/i.test(merchantOid.trim());
}

export function isFeatureBoostMerchantOid(merchantOid: string): boolean {
  return /^FB/i.test(merchantOid.trim());
}

export function parseBayiMembershipMerchantOid(
  merchantOid: string
): { dealerType: DealerType } | null {
  const m = /^BM([1-4])T\d+$/i.exec(merchantOid.trim());
  if (!m) return null;
  const dealerType = OID_CODE_TO_DEALER[m[1]];
  return dealerType ? { dealerType } : null;
}

export function bayiMembershipAmountKurus(dealerType: DealerType): number {
  return Math.round(getMonthlyFeeForType(dealerType) * 100);
}
