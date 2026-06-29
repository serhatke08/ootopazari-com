import type { SupabaseClient } from "@supabase/supabase-js";

export type ListingBoostPaymentInfo = {
  merchantOid: string;
  packDays: number;
  status: "paid" | "pending" | "failed";
  paidAt: string | null;
  createdAt: string;
};

/** İlan başına en güncel öne çıkarma ödeme kaydı (paid öncelikli). */
export async function fetchBoostPaymentInfoByListing(
  supabase: SupabaseClient,
  userId: string,
  listingIds: string[]
): Promise<Map<string, ListingBoostPaymentInfo>> {
  const result = new Map<string, ListingBoostPaymentInfo>();
  if (listingIds.length === 0) return result;

  const { data: directRows } = await supabase
    .from("feature_boost_payments")
    .select("merchant_oid,listing_id,pack_days,status,paid_at,created_at")
    .eq("user_id", userId)
    .in("listing_id", listingIds)
    .order("created_at", { ascending: false });

  const { data: itemRows } = await supabase
    .from("feature_boost_payment_items")
    .select("merchant_oid,listing_id,pack_days")
    .in("listing_id", listingIds);

  const itemPackDays = new Map<string, number>();
  for (const row of itemRows ?? []) {
    itemPackDays.set(String(row.listing_id), Number(row.pack_days));
  }

  const { data: itemPayments } =
    itemRows && itemRows.length > 0
      ? await supabase
          .from("feature_boost_payments")
          .select("merchant_oid,pack_days,status,paid_at,created_at")
          .eq("user_id", userId)
          .in(
            "merchant_oid",
            [...new Set(itemRows.map((r) => String(r.merchant_oid)))]
          )
          .order("created_at", { ascending: false })
      : { data: [] as never[] };

  const paymentByOid = new Map(
    (itemPayments ?? []).map((p) => [String(p.merchant_oid), p])
  );

  for (const row of itemRows ?? []) {
    const listingId = String(row.listing_id);
    if (result.has(listingId)) continue;
    const pay = paymentByOid.get(String(row.merchant_oid));
    if (!pay) continue;
    result.set(listingId, {
      merchantOid: String(pay.merchant_oid),
      packDays: itemPackDays.get(listingId) ?? Number(pay.pack_days),
      status: pay.status as ListingBoostPaymentInfo["status"],
      paidAt: pay.paid_at ? String(pay.paid_at) : null,
      createdAt: String(pay.created_at),
    });
  }

  const statusRank = { paid: 3, pending: 2, failed: 1 } as const;

  for (const row of directRows ?? []) {
    const listingId = String(row.listing_id);
    const next: ListingBoostPaymentInfo = {
      merchantOid: String(row.merchant_oid),
      packDays: Number(row.pack_days),
      status: row.status as ListingBoostPaymentInfo["status"],
      paidAt: row.paid_at ? String(row.paid_at) : null,
      createdAt: String(row.created_at),
    };
    const prev = result.get(listingId);
    if (!prev || statusRank[next.status] > statusRank[prev.status]) {
      result.set(listingId, next);
    }
  }

  return result;
}

export function boostPaymentStatusLabel(
  info: ListingBoostPaymentInfo | undefined
): string | null {
  if (!info) return null;
  if (info.status === "paid") {
    return `${info.packDays} günlük paket (ödendi)`;
  }
  if (info.status === "pending") {
    return `${info.packDays} günlük paket — ödeme alındı, ilana yazılıyor`;
  }
  return `${info.packDays} günlük paket — ödeme başarısız`;
}
