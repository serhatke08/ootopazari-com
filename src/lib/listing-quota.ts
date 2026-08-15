import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAdminProfileByUserId } from "@/lib/admin-profile";
import { normalizeDealerState } from "@/lib/bayi-application-status";
import type { ApplicationStatus, PaymentStatus } from "@/lib/bayi-types";

export const YEARLY_FREE_LISTING_QUOTA = 5;
export const LISTING_ACTIVE_DAYS = 30;

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

export function listingIsPastActiveWindow(listing: {
  activated_at?: unknown;
  created_at?: unknown;
}): boolean {
  const at = listingActivatedAt(listing);
  if (!at) return false;
  const cutoff = Date.now() - LISTING_ACTIVE_DAYS * 24 * 60 * 60 * 1000;
  return at.getTime() < cutoff;
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

  const [createdRes, reactivateRes] = await Promise.all([
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("listing_quota_uses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("kind", "reactivate")
      .gte("created_at", yearStart),
  ]);

  if (createdRes.error) {
    console.warn("listing quota listings:", createdRes.error.message);
  }
  if (reactivateRes.error) {
    console.warn("listing quota reactivations:", reactivateRes.error.message);
  }

  const used = (createdRes.count ?? 0) + (reactivateRes.count ?? 0);
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

export async function expireDueListings(
  supabase: SupabaseClient,
  options?: { userId?: string; listingId?: string }
): Promise<number> {
  const cutoff = new Date(
    Date.now() - LISTING_ACTIVE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  let q = supabase
    .from("listings")
    .select("id,user_id,listing_number,activated_at,created_at")
    .eq("moderation_status", "approved")
    .or(
      `activated_at.lt.${cutoff},and(activated_at.is.null,created_at.lt.${cutoff})`
    )
    .limit(200);
  if (options?.userId) q = q.eq("user_id", options.userId);
  if (options?.listingId) q = q.eq("id", options.listingId);

  const { data, error } = await q;
  if (error) {
    console.warn("expireDueListings select:", error.message);
    return 0;
  }

  const due = data ?? [];
  if (due.length === 0) return 0;

  const ids = due
    .map((r) => (r as { id?: string }).id)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return 0;

  const { error: updErr } = await supabase
    .from("listings")
    .update({
      moderation_status: "expired",
      suspension_reason: "İlan süresi (1 ay) doldu.",
    })
    .in("id", ids)
    .eq("moderation_status", "approved");

  if (updErr) {
    console.warn("expireDueListings update:", updErr.message);
    return 0;
  }

  const notifications = due
    .map((row) => {
      const r = row as {
        id?: string;
        user_id?: string | null;
        listing_number?: number | string | null;
      };
      if (!r.user_id || !r.id) return null;
      const num = r.listing_number != null ? String(r.listing_number) : "";
      return {
        user_id: r.user_id,
        type: "listing_expired",
        title: "İlanınız pasife alındı",
        body:
          num !== ""
            ? `İlan no #${num} 1 aylık süreyi doldurduğu için yayından kaldırıldı. Tekrar aktif etmek bir ilan hakkı kullanır.`
            : "İlanınız 1 aylık süreyi doldurduğu için yayından kaldırıldı. Tekrar aktif etmek bir ilan hakkı kullanır.",
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
