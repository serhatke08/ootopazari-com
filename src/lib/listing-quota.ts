import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAdminProfileByUserId } from "@/lib/admin-profile";
import { normalizeDealerState } from "@/lib/bayi-application-status";
import type { ApplicationStatus, PaymentStatus } from "@/lib/bayi-types";

export const YEARLY_FREE_LISTING_QUOTA = 5;
export const LISTING_ACTIVE_DAYS = 30;
export const LISTING_EXPIRED_GRACE_DAYS = 5;

const MS_DAY = 24 * 60 * 60 * 1000;

export type ListingQuotaSnapshot = {
  year: number;
  limit: number;
  used: number;
  remaining: number;
  unlimited: boolean;
};

export function istanbulCalendarYear(d = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "year")?.value);
}

export function istanbulYearStartIso(year: number): string {
  return new Date(`${year}-01-01T00:00:00+03:00`).toISOString();
}

export function listingActivatedAt(listing: {
  activated_at?: unknown;
  created_at?: unknown;
}): Date | null {
  const raw = listing.activated_at ?? listing.created_at;
  if (raw == null || raw === "") return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function listingActiveCutoffIso(now = Date.now()): string {
  return new Date(now - LISTING_ACTIVE_DAYS * MS_DAY).toISOString();
}

export function listingIsPastActiveWindow(listing: {
  activated_at?: unknown;
  created_at?: unknown;
}): boolean {
  const at = listingActivatedAt(listing);
  if (!at) return false;
  return at.getTime() < Date.now() - LISTING_ACTIVE_DAYS * MS_DAY;
}

export function listingExpiredAt(listing: {
  expired_at?: unknown;
  updated_at?: unknown;
  activated_at?: unknown;
  created_at?: unknown;
}): Date | null {
  const raw = listing.expired_at;
  if (raw != null && raw !== "") {
    const d = new Date(String(raw));
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (listing.updated_at != null && listing.updated_at !== "") {
    const d = new Date(String(listing.updated_at));
    if (!Number.isNaN(d.getTime())) return d;
  }
  const liveStart = listingActivatedAt(listing);
  if (liveStart) {
    return new Date(liveStart.getTime() + LISTING_ACTIVE_DAYS * MS_DAY);
  }
  return null;
}

export function listingPurgeAt(listing: {
  expired_at?: unknown;
  updated_at?: unknown;
  activated_at?: unknown;
  created_at?: unknown;
}): Date | null {
  const expiredAt = listingExpiredAt(listing);
  if (!expiredAt) return null;
  return new Date(expiredAt.getTime() + LISTING_EXPIRED_GRACE_DAYS * MS_DAY);
}

export function formatListingPurgeCountdown(listing: {
  expired_at?: unknown;
  updated_at?: unknown;
  activated_at?: unknown;
  created_at?: unknown;
}): string {
  const at = listingPurgeAt(listing);
  if (!at) {
    return `${LISTING_EXPIRED_GRACE_DAYS} gün içinde kalıcı silinecek.`;
  }
  const ms = at.getTime() - Date.now();
  if (ms <= 0) return "Bu ilan yakında kalıcı silinecek.";
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days >= 1 && remHours > 0) {
    return `${days} gün ${remHours} saat sonra kalıcı silinecek.`;
  }
  if (days >= 1) return `${days} gün sonra kalıcı silinecek.`;
  if (hours >= 1) return `${hours} saat sonra kalıcı silinecek.`;
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `${mins} dakika sonra kalıcı silinecek.`;
}

export function isListingExpired(listing: { moderation_status?: unknown }): boolean {
  return String(listing.moderation_status ?? "").toLowerCase() === "expired";
}

export async function userHasUnlimitedListingQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const admin = await fetchAdminProfileByUserId(supabase, userId);
  if (admin) return true;

  const { data, error } = await supabase
    .from("bayi_applications")
    .select("status,payment_status,membership_expires_at")
    .eq("user_id", userId);
  if (error) {
    console.warn("listing quota bayi:", error.message);
    return false;
  }
  for (const row of data ?? []) {
    const state = normalizeDealerState(
      String((row as { status?: string }).status ?? "") as ApplicationStatus,
      String((row as { payment_status?: string }).payment_status ?? "") as PaymentStatus,
      (row as { membership_expires_at?: string | null }).membership_expires_at ??
        null
    );
    if (state === "active") return true;
  }
  return false;
}

export async function fetchListingQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<ListingQuotaSnapshot> {
  const year = istanbulCalendarYear();
  const unlimited = await userHasUnlimitedListingQuota(supabase, userId);
  if (unlimited) {
    return {
      year,
      limit: YEARLY_FREE_LISTING_QUOTA,
      used: 0,
      remaining: YEARLY_FREE_LISTING_QUOTA,
      unlimited: true,
    };
  }

  const yearStart = istanbulYearStartIso(year);
  const listingIds = new Set<string>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("listings")
      .select("id")
      .eq("user_id", userId)
      .range(from, from + pageSize - 1);
    if (error) {
      console.warn("listing quota listings:", error.message);
      break;
    }
    const rows = data ?? [];
    for (const row of rows) {
      const id = String((row as { id?: unknown }).id ?? "").trim();
      if (id) listingIds.add(id);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  let reactivateUsed = 0;
  const { data: reactivates, error: reactivateErr } = await supabase
    .from("listing_quota_uses")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "reactivate")
    .gte("created_at", yearStart);
  if (reactivateErr) {
    console.warn("listing quota reactivations:", reactivateErr.message);
  } else {
    reactivateUsed = reactivates?.length ?? 0;
  }

  const used = listingIds.size + reactivateUsed;
  return {
    year,
    limit: YEARLY_FREE_LISTING_QUOTA,
    used,
    remaining: Math.max(0, YEARLY_FREE_LISTING_QUOTA - used),
    unlimited: false,
  };
}

export async function recordListingQuotaUse(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
  kind: "create" | "reactivate"
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from("listing_quota_uses").insert({
    user_id: userId,
    listing_id: listingId,
    kind,
  });
  if (error) {
    if (kind === "create" && /duplicate|unique/i.test(error.message)) {
      return { ok: true };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

type ExpireRow = {
  id?: string;
  user_id?: string | null;
  listing_number?: number | string | null;
  activated_at?: unknown;
  created_at?: unknown;
  expired_at?: unknown;
  updated_at?: unknown;
};

async function selectApprovedOlderThanWindow(
  supabase: SupabaseClient,
  options?: { userId?: string; listingId?: string }
): Promise<ExpireRow[]> {
  const cutoff = listingActiveCutoffIso();
  const selectWithActivated =
    "id,user_id,listing_number,activated_at,created_at";
  const selectPlain = "id,user_id,listing_number,created_at";

  const run = async (cols: string) => {
    let q = supabase
      .from("listings")
      .select(cols)
      .eq("moderation_status", "approved")
      .lt("created_at", cutoff)
      .limit(400);
    if (options?.userId) q = q.eq("user_id", options.userId);
    if (options?.listingId) q = q.eq("id", options.listingId);
    return q;
  };

  const first = await run(selectWithActivated);
  if (!first.error) return (first.data ?? []) as ExpireRow[];
  if (!/activated_at/i.test(first.error.message)) {
    console.warn("expireDueListings select:", first.error.message);
    return [];
  }
  const fallback = await run(selectPlain);
  if (fallback.error) {
    console.warn("expireDueListings select:", fallback.error.message);
    return [];
  }
  return (fallback.data ?? []) as ExpireRow[];
}

export async function expireDueListings(
  supabase: SupabaseClient,
  options?: { userId?: string; listingId?: string }
): Promise<number> {
  const rows = await selectApprovedOlderThanWindow(supabase, options);
  const due = rows.filter((row) => listingIsPastActiveWindow(row));
  if (due.length === 0) return 0;

  const ids = due
    .map((r) => r.id)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return 0;

  const now = new Date().toISOString();
  const withExpiredAt = await supabase
    .from("listings")
    .update({
      moderation_status: "expired",
      expired_at: now,
      updated_at: now,
      suspension_reason: "İlan süresi (30 gün) doldu.",
    })
    .in("id", ids)
    .eq("moderation_status", "approved");

  if (withExpiredAt.error) {
    const withoutExpiredAt = await supabase
      .from("listings")
      .update({
        moderation_status: "expired",
        updated_at: now,
        suspension_reason: "İlan süresi (30 gün) doldu.",
      })
      .in("id", ids)
      .eq("moderation_status", "approved");
    if (withoutExpiredAt.error) {
      console.warn("expireDueListings update:", withoutExpiredAt.error.message);
      return 0;
    }
  }

  const notifications = due
    .map((r) => {
      if (!r.user_id || !r.id) return null;
      const num = r.listing_number != null ? String(r.listing_number) : "";
      const grace = `${LISTING_EXPIRED_GRACE_DAYS} gün`;
      return {
        user_id: r.user_id,
        type: "listing_expired",
        title: "İlanınız pasife alındı",
        body:
          num !== ""
            ? `İlan no #${num} 30 günlük yayını doldurduğu için pasife alındı. ${grace} içinde tekrar aktif etmezseniz kalıcı silinir.`
            : `İlanınız 30 günlük yayını doldurduğu için pasife alındı. ${grace} içinde tekrar aktif etmezseniz kalıcı silinir.`,
        listing_id: r.id,
      };
    })
    .filter(Boolean);

  if (notifications.length > 0) {
    const { error: notifErr } = await supabase
      .from("user_notifications")
      .insert(notifications);
    if (notifErr) {
      console.warn("expireDueListings notify:", notifErr.message);
    }
  }

  return ids.length;
}

async function stampMissingExpiredAt(supabase: SupabaseClient): Promise<void> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("listings")
    .select("id")
    .eq("moderation_status", "expired")
    .is("expired_at", null)
    .limit(400);
  if (error) {
    if (!/expired_at/i.test(error.message)) {
      console.warn("stampMissingExpiredAt:", error.message);
    }
    return;
  }
  const ids = (data ?? [])
    .map((r) => (r as { id?: string }).id)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return;
  const { error: updErr } = await supabase
    .from("listings")
    .update({ expired_at: now, updated_at: now })
    .in("id", ids)
    .eq("moderation_status", "expired");
  if (updErr) {
    console.warn("stampMissingExpiredAt update:", updErr.message);
  }
}

export async function purgeExpiredListings(
  supabase: SupabaseClient
): Promise<number> {
  const cutoff = new Date(
    Date.now() - LISTING_EXPIRED_GRACE_DAYS * MS_DAY
  ).toISOString();

  const quoted = `"${cutoff}"`;
  let rows: ExpireRow[] = [];
  const withCol = await supabase
    .from("listings")
    .select("id,expired_at,updated_at,activated_at,created_at")
    .eq("moderation_status", "expired")
    .or(`expired_at.lt.${quoted},and(expired_at.is.null,updated_at.lt.${quoted})`)
    .limit(200);

  if (withCol.error) {
    const fallback = await supabase
      .from("listings")
      .select("id,updated_at,created_at")
      .eq("moderation_status", "expired")
      .lt("updated_at", cutoff)
      .limit(200);
    if (fallback.error) {
      console.warn("purgeExpiredListings select:", fallback.error.message);
      return 0;
    }
    rows = (fallback.data ?? []) as ExpireRow[];
  } else {
    rows = (withCol.data ?? []) as ExpireRow[];
  }

  const due = rows.filter((row) => {
    const at = listingPurgeAt(row);
    return at != null && at.getTime() <= Date.now();
  });
  const ids = due
    .map((r) => r.id)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return 0;

  const { error: delErr } = await supabase
    .from("listings")
    .delete()
    .in("id", ids)
    .eq("moderation_status", "expired");
  if (delErr) {
    console.warn("purgeExpiredListings delete:", delErr.message);
    return 0;
  }
  return ids.length;
}

export async function maintainListingLifecycle(
  supabase: SupabaseClient
): Promise<{ expired: number; purged: number }> {
  const expired = await expireDueListings(supabase);
  await stampMissingExpiredAt(supabase);
  const purged = await purgeExpiredListings(supabase);
  return { expired, purged };
}
