import type { SupabaseClient } from "@supabase/supabase-js";
import type { DealerType } from "@/lib/bayi-types";
import { DEALER_TYPE_LABELS } from "@/lib/bayi-types";

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
  listingId?: string;
  listingNumber?: string;
  dealerType?: DealerType;
  membershipExpiresAt?: string | null;
};

const DUPLICATE_PAID_WINDOW_MS = 60 * 60 * 1000;

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

/** Aynı ilana kısa sürede yapılan tekrarlı ödeme denemelerini tek kayıtta göster. */
function dedupePaidBoostEntries(
  entries: PaymentHistoryEntry[]
): PaymentHistoryEntry[] {
  const bayi = entries.filter((e) => e.kind === "bayi_membership");
  const boosts = entries
    .filter((e) => e.kind === "feature_boost")
    .sort(
      (a, b) =>
        new Date(b.paidAt ?? b.createdAt).getTime() -
        new Date(a.paidAt ?? a.createdAt).getTime()
    );

  const kept: PaymentHistoryEntry[] = [];
  const latestPaidAt = new Map<string, number>();

  for (const entry of boosts) {
    if (entry.status !== "paid" || !entry.listingId) {
      kept.push(entry);
      continue;
    }

    const key = `${entry.listingId}:${entry.packDays ?? 0}`;
    const paidAt = new Date(entry.paidAt ?? entry.createdAt).getTime();
    const prev = latestPaidAt.get(key);

    if (prev != null && Math.abs(prev - paidAt) < DUPLICATE_PAID_WINDOW_MS) {
      continue;
    }

    latestPaidAt.set(key, paidAt);
    kept.push(entry);
  }

  return [...kept, ...bayi].sort(
    (a, b) =>
      new Date(b.paidAt ?? b.createdAt).getTime() -
      new Date(a.paidAt ?? a.createdAt).getTime()
  );
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
        "merchant_oid,status,amount_kurus,pack_days,created_at,paid_at,listing_id,paytr_status"
      )
      .eq("user_id", userId)
      .neq("paytr_status", "superseded")
      .order("created_at", { ascending: false })
      .limit(limit * 2),
    supabase
      .from("bayi_membership_payments")
      .select(
        "merchant_oid,status,amount_kurus,dealer_type,membership_days,created_at,paid_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const boostRows = (boostRes.data ?? []).filter(
    (row) => row.status === "paid" || row.status === "pending"
  );

  const listingIds = [
    ...new Set(
      boostRows
        .map((r) => r.listing_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const listingNumbers = new Map<string, string>();
  if (listingIds.length > 0) {
    const { data: listings } = await supabase
      .from("listings")
      .select("id,listing_number")
      .in("id", listingIds);
    for (const row of listings ?? []) {
      if (row.id && row.listing_number != null) {
        listingNumbers.set(String(row.id), String(row.listing_number));
      }
    }
  }

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
    const listingId = row.listing_id ? String(row.listing_id) : undefined;
    const listingNumber = listingId
      ? listingNumbers.get(listingId)
      : undefined;
    const listingCount = itemCounts.get(merchantOid) ?? 1;

    entries.push({
      id: `boost:${merchantOid}`,
      kind: "feature_boost",
      merchantOid,
      status: row.status as PaymentHistoryEntry["status"],
      amountKurus: Number(row.amount_kurus),
      createdAt: String(row.created_at),
      paidAt: row.paid_at ? String(row.paid_at) : null,
      title: listingNumber
        ? `İlan öne çıkarma · #${listingNumber}`
        : "İlan öne çıkarma",
      detail: [
        `${packDays} gün paket`,
        listingCount > 1 ? `${listingCount} ilan` : null,
        statusLabel(String(row.status)),
      ]
        .filter(Boolean)
        .join(" · "),
      packDays,
      listingCount,
      listingId,
      listingNumber,
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
      detail: `${days} günlük abonelik · ${statusLabel(String(row.status))}`,
      dealerType,
    });
  }

  return dedupePaidBoostEntries(entries).slice(0, limit);
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
