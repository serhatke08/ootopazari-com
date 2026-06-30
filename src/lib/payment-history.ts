import type { SupabaseClient } from "@supabase/supabase-js";
import type { DealerType } from "@/lib/bayi-types";
import { DEALER_TYPE_LABELS } from "@/lib/bayi-types";

export type PaymentHistoryKind = "feature_boost" | "bayi_membership";

export type PaymentHistoryEntry = {
  id: string;
  kind: PaymentHistoryKind;
  merchantOid: string;
  status: "pending" | "paid" | "failed";
  amountKurus: number | null;
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
  featureBoostEndsAt?: string | null;
  inferredFromService?: boolean;
};

export type PaymentServiceSummary = {
  id: string;
  kind: PaymentHistoryKind;
  title: string;
  detail: string | null;
  href: string;
  expiresAt: string | null;
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

function addDays(iso: string | null | undefined, days: number): string | null {
  if (!iso || !Number.isFinite(days) || days <= 0) return null;
  const base = new Date(String(iso));
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base.getTime());
  next.setDate(next.getDate() + days);
  return next.toISOString();
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
      .order("created_at", { ascending: false })
      .limit(limit * 2),
    supabase
      .from("bayi_membership_payments")
      .select(
        "merchant_oid,application_id,status,amount_kurus,dealer_type,membership_days,created_at,paid_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const boostRows = (boostRes.data ?? []).filter(
    (row) => String(row.paytr_status ?? "") !== "superseded"
  );

  const merchantOids = boostRows.map((r) => String(r.merchant_oid));
  const itemCounts = new Map<string, number>();
  const itemListingIds = new Map<string, string[]>();
  if (merchantOids.length > 0) {
    const { data: items } = await supabase
      .from("feature_boost_payment_items")
      .select("merchant_oid,listing_id")
      .in("merchant_oid", merchantOids);
    for (const row of items ?? []) {
      const oid = String(row.merchant_oid);
      const listingId = String(row.listing_id);
      itemCounts.set(oid, (itemCounts.get(oid) ?? 0) + 1);
      itemListingIds.set(oid, [...(itemListingIds.get(oid) ?? []), listingId]);
    }
  }

  const listingIds = [
    ...new Set(
      [
        ...boostRows
          .map((r) => r.listing_id as string | null)
          .filter((id): id is string => Boolean(id)),
        ...Array.from(itemListingIds.values()).flat(),
      ].filter(Boolean)
    ),
  ];

  const listingNumbers = new Map<string, string>();
  const listingBoostEnds = new Map<string, string | null>();
  if (listingIds.length > 0) {
    const { data: listings } = await supabase
      .from("listings")
      .select(
        "id,listing_number,featured_until,feature_boost_campaign_start_at,featured_started_at,feature_boost_pack_days"
      )
      .in("id", listingIds);
    for (const row of listings ?? []) {
      if (row.id && row.listing_number != null) {
        listingNumbers.set(String(row.id), String(row.listing_number));
      }
      const packDays = Number(row.feature_boost_pack_days);
      const campaignStart =
        String(row.feature_boost_campaign_start_at ?? "") ||
        String(row.featured_started_at ?? "");
      const computedEnd = addDays(campaignStart, packDays);
      listingBoostEnds.set(
        String(row.id),
        computedEnd ?? (row.featured_until ? String(row.featured_until) : null)
      );
    }
  }

  const applicationIds = [
    ...new Set(
      (bayiRes.data ?? [])
        .map((r) => r.application_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const membershipExpiresByApplication = new Map<string, string | null>();
  if (applicationIds.length > 0) {
    const { data: applications } = await supabase
      .from("bayi_applications")
      .select("id,membership_expires_at")
      .in("id", applicationIds);
    for (const row of applications ?? []) {
      membershipExpiresByApplication.set(
        String(row.id),
        row.membership_expires_at ? String(row.membership_expires_at) : null
      );
    }
  }

  const entries: PaymentHistoryEntry[] = [];
  const listedBoostListingIds = new Set<string>();

  for (const row of boostRows) {
    const merchantOid = String(row.merchant_oid);
    const packDays = Number(row.pack_days);
    const listingId = row.listing_id ? String(row.listing_id) : undefined;
    const listingNumber = listingId
      ? listingNumbers.get(listingId)
      : undefined;
    const listingCount = itemCounts.get(merchantOid) ?? 1;
    const relatedListingIds =
      itemListingIds.get(merchantOid) ?? (listingId ? [listingId] : []);
    const featureBoostEndsAt = relatedListingIds
      .map((id) => listingBoostEnds.get(id) ?? null)
      .filter((v): v is string => Boolean(v))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    for (const id of relatedListingIds) {
      listedBoostListingIds.add(id);
    }

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
      featureBoostEndsAt,
    });
  }

  const { data: serviceListings } = await supabase
    .from("listings")
    .select(
      "id,listing_number,title,featured_until,featured_started_at,feature_boost_campaign_start_at,feature_boost_pack_days"
    )
    .eq("user_id", userId)
    .not("featured_until", "is", null)
    .order("featured_until", { ascending: false })
    .limit(limit);

  for (const row of serviceListings ?? []) {
    const listingId = row.id ? String(row.id) : "";
    if (!listingId || listedBoostListingIds.has(listingId)) continue;

    const packDays = Number(row.feature_boost_pack_days);
    const campaignStart =
      String(row.feature_boost_campaign_start_at ?? "") ||
      String(row.featured_started_at ?? "");
    const createdAt =
      campaignStart ||
      (row.featured_until ? String(row.featured_until) : new Date().toISOString());
    const featureBoostEndsAt =
      addDays(campaignStart, packDays) ??
      (row.featured_until ? String(row.featured_until) : null);
    const listingNumber =
      row.listing_number != null ? String(row.listing_number) : undefined;
    const expired =
      featureBoostEndsAt != null &&
      new Date(featureBoostEndsAt).getTime() <= Date.now();

    entries.push({
      id: `boost-service-history:${listingId}`,
      kind: "feature_boost",
      merchantOid: listingNumber ? `İlan #${listingNumber}` : "İlan hizmet kaydı",
      status: "paid",
      amountKurus: null,
      createdAt,
      paidAt: null,
      title: listingNumber
        ? `İlan öne çıkarma · #${listingNumber}`
        : "İlan öne çıkarma",
      detail: [
        packDays > 0 ? `${packDays} gün paket` : "Öne çıkarma hizmeti",
        expired ? "Süre doldu" : "Aktif",
      ].join(" · "),
      packDays: Number.isFinite(packDays) && packDays > 0 ? packDays : undefined,
      listingCount: 1,
      listingId,
      listingNumber,
      featureBoostEndsAt,
      inferredFromService: true,
    });
  }

  for (const row of bayiRes.data ?? []) {
    const dealerType = String(row.dealer_type) as DealerType;
    const merchantOid = String(row.merchant_oid);
    const days = Number(row.membership_days) || 30;
    const applicationId = row.application_id ? String(row.application_id) : null;
    const membershipExpiresAt = applicationId
      ? membershipExpiresByApplication.get(applicationId) ?? null
      : null;

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
      membershipExpiresAt,
    });
  }

  return dedupePaidBoostEntries(entries).slice(0, limit);
}

export async function fetchUserPaymentServiceSummaries(
  supabase: SupabaseClient,
  userId: string
): Promise<PaymentServiceSummary[]> {
  const [bayiRes, listingRes] = await Promise.all([
    supabase
      .from("bayi_applications")
      .select("id,dealer_type,status,payment_status,membership_expires_at")
      .eq("user_id", userId),
    supabase
      .from("listings")
      .select(
        "id,listing_number,title,featured_until,featured_started_at,feature_boost_campaign_start_at,feature_boost_pack_days"
      )
      .eq("user_id", userId),
  ]);

  const summaries: PaymentServiceSummary[] = [];
  const now = Date.now();

  for (const row of bayiRes.data ?? []) {
    const expiresAt = row.membership_expires_at
      ? String(row.membership_expires_at)
      : null;
    const dealerType = String(row.dealer_type) as DealerType;
    const isPaid = String(row.payment_status) === "paid";
    if (!expiresAt && !isPaid) continue;
    if (expiresAt && new Date(expiresAt).getTime() <= now) continue;

    summaries.push({
      id: `bayi-service:${row.id}`,
      kind: "bayi_membership",
      title: `${DEALER_TYPE_LABELS[dealerType] ?? dealerType} bayi aboneliği`,
      detail: isPaid ? "Aktif bayi üyeliği" : "Üyelik ödeme bekliyor",
      href: `/bayi/panel/${dealerType}`,
      expiresAt,
    });
  }

  for (const row of listingRes.data ?? []) {
    const packDays = Number(row.feature_boost_pack_days);
    const campaignStart =
      String(row.feature_boost_campaign_start_at ?? "") ||
      String(row.featured_started_at ?? "");
    const computedEnd = addDays(campaignStart, packDays);
    const expiresAt =
      computedEnd ?? (row.featured_until ? String(row.featured_until) : null);
    if (!expiresAt) continue;
    if (new Date(expiresAt).getTime() <= now) continue;

    const listingNumber = row.listing_number ? String(row.listing_number) : "";
    const title = String(row.title ?? "").trim();
    summaries.push({
      id: `boost-service:${row.id}`,
      kind: "feature_boost",
      title: listingNumber
        ? `İlan öne çıkarma · #${listingNumber}`
        : "İlan öne çıkarma",
      detail: [
        title || null,
        packDays > 0 ? `${packDays} günlük paket` : "Aktif öne çıkarma",
      ]
        .filter(Boolean)
        .join(" · "),
      href: "/profil/ilanlarim",
      expiresAt,
    });
  }

  return summaries.sort((a, b) => {
    if (!a.expiresAt && !b.expiresAt) return 0;
    if (!a.expiresAt) return 1;
    if (!b.expiresAt) return -1;
    return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
  });
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
