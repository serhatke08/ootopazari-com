import type { SupabaseClient } from "@supabase/supabase-js";
import type { DealerType } from "@/lib/bayi-types";
import { DEALER_TYPE_LABELS } from "@/lib/bayi-types";
import { featureBoostProductIdForPackDays } from "@/lib/listing-feature-boost";

export type PaymentHistoryKind = "feature_boost" | "bayi_membership";

export type PaymentHistoryEntry = {
  id: string;
  kind: PaymentHistoryKind;
  merchantOid: string;
  status: "pending" | "paid" | "failed";
  amountKurus: number;
  createdAt: string;
  paidAt: string | null;
  title: string;
  detail: string | null;
  packDays?: number;
  listingCount?: number;
  dealerType?: DealerType;
  membershipExpiresAt?: string | null;
};

function formatTryFromKurus(kurus: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(kurus / 100);
}

function statusLabel(status: string): string {
  switch (status) {
    case "paid":
      return "Ödendi";
    case "failed":
      return "Başarısız";
    default:
      return "Beklemede";
  }
}

export async function fetchUserPaymentHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<PaymentHistoryEntry[]> {
  const [boostRes, bayiRes] = await Promise.all([
    supabase
      .from("feature_boost_payments")
      .select(
        "merchant_oid,status,amount_kurus,pack_days,created_at,paid_at,listing_id"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("bayi_membership_payments")
      .select(
        "merchant_oid,status,amount_kurus,dealer_type,membership_days,created_at,paid_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const boostRows = boostRes.data ?? [];
  const merchantOids = boostRows.map((r) => String(r.merchant_oid));

  const itemCounts = new Map<string, number>();
  if (merchantOids.length > 0) {
    const { data: items } = await supabase
      .from("feature_boost_payment_items")
      .select("merchant_oid")
      .in("merchant_oid", merchantOids);
    for (const row of items ?? []) {
      const oid = String(row.merchant_oid);
      itemCounts.set(oid, (itemCounts.get(oid) ?? 0) + 1);
    }
  }

  const entries: PaymentHistoryEntry[] = [];

  for (const row of boostRows) {
    const merchantOid = String(row.merchant_oid);
    const packDays = Number(row.pack_days);
    const productId = featureBoostProductIdForPackDays(packDays);
    const listingCount = itemCounts.get(merchantOid) ?? 1;
    const amountKurus = Number(row.amount_kurus);

    entries.push({
      id: `boost:${merchantOid}`,
      kind: "feature_boost",
      merchantOid,
      status: row.status as PaymentHistoryEntry["status"],
      amountKurus,
      createdAt: String(row.created_at),
      paidAt: row.paid_at ? String(row.paid_at) : null,
      title: "İlan öne çıkarma",
      detail: [
        `${packDays} gün paket`,
        listingCount > 1 ? `${listingCount} ilan` : null,
        productId ? null : null,
        statusLabel(String(row.status)),
      ]
        .filter(Boolean)
        .join(" · "),
      packDays,
      listingCount,
    });
  }

  for (const row of bayiRes.data ?? []) {
    const dealerType = String(row.dealer_type) as DealerType;
    const merchantOid = String(row.merchant_oid);
    const days = Number(row.membership_days) || 30;

    entries.push({
      id: `bayi:${merchantOid}`,
      kind: "bayi_membership",
      merchantOid,
      status: row.status as PaymentHistoryEntry["status"],
      amountKurus: Number(row.amount_kurus),
      createdAt: String(row.created_at),
      paidAt: row.paid_at ? String(row.paid_at) : null,
      title: `${DEALER_TYPE_LABELS[dealerType] ?? dealerType} bayi üyeliği`,
      detail: `${days} günlük abonelik · ${statusLabel(String(row.status))} · ${formatTryFromKurus(Number(row.amount_kurus))}`,
      dealerType,
    });
  }

  entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return entries.slice(0, limit);
}

export function paymentHistoryStatusTone(
  status: PaymentHistoryEntry["status"]
): "emerald" | "amber" | "red" {
  switch (status) {
    case "paid":
      return "emerald";
    case "failed":
      return "red";
    default:
      return "amber";
  }
}

export function formatPaymentHistoryAmount(kurus: number): string {
  return formatTryFromKurus(kurus);
}
