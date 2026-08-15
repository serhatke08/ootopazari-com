import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  expireDueListings,
  fetchListingQuota,
  isListingExpired,
  recordListingQuotaUse,
} from "@/lib/listing-quota";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { listingId?: unknown };
  try {
    body = (await req.json()) as { listingId?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const listingId =
    typeof body.listingId === "string" && body.listingId.trim() !== ""
      ? body.listingId.trim()
      : null;
  if (!listingId) {
    return NextResponse.json({ ok: false, error: "listingId" }, { status: 400 });
  }

  await expireDueListings(supabase, { listingId, userId: user.id });

  const { data: listing, error: fetchErr } = await supabase
    .from("listings")
    .select("id,user_id,moderation_status")
    .eq("id", listingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !listing) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (!isListingExpired(listing)) {
    return NextResponse.json(
      { ok: false, error: "not_expired", message: "Bu ilan zaten aktif." },
      { status: 409 }
    );
  }

  const admin = createSupabaseServiceClient() ?? supabase;
  const quota = await fetchListingQuota(admin, user.id);
  if (!quota.unlimited && quota.remaining <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "quota",
        message: `Son 12 ayda ${quota.limit} ücretsiz yayın hakkınız doldu.`,
      },
      { status: 403 }
    );
  }

  const used = await recordListingQuotaUse(
    admin,
    user.id,
    listingId,
    quota.unlimited ? "membership" : "free"
  );
  if (!used.ok) {
    return NextResponse.json(
      { ok: false, error: "quota_write", message: used.message },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const payload = {
    moderation_status: "approved",
    activated_at: now,
    expired_at: null,
    suspension_reason: null,
    suspended_at: null,
  };
  let { error: updErr } = await admin
    .from("listings")
    .update(payload)
    .eq("id", listingId)
    .eq("user_id", user.id);
  if (updErr && /expired_at/i.test(updErr.message)) {
    const { expired_at: _drop, ...withoutExpiredAt } = payload;
    ({ error: updErr } = await admin
      .from("listings")
      .update(withoutExpiredAt)
      .eq("id", listingId)
      .eq("user_id", user.id));
  }

  if (updErr) {
    return NextResponse.json(
      { ok: false, error: "update_failed", message: updErr.message },
      { status: 500 }
    );
  }

  const next = await fetchListingQuota(admin, user.id);
  return NextResponse.json({ ok: true, quota: next });
}
