import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAdminProfileByUserId } from "@/lib/admin-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = await fetchAdminProfileByUserId(supabase, user.id);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: { listingId?: unknown; reason?: unknown };
  try {
    body = (await req.json()) as { listingId?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const listingId =
    typeof body.listingId === "string" && body.listingId.trim() !== ""
      ? body.listingId.trim()
      : null;
  const reason =
    typeof body.reason === "string" ? body.reason.trim() : "";
  if (!listingId) {
    return NextResponse.json({ ok: false, error: "listingId" }, { status: 400 });
  }
  if (reason.length < 3) {
    return NextResponse.json(
      { ok: false, error: "reason_min", message: "Sebep en az 3 karakter olmalı." },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "server_config", message: "SUPABASE_SERVICE_ROLE_KEY eksik." },
      { status: 500 }
    );
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listing, error: fetchErr } = await adminClient
    .from("listings")
    .select("id,user_id,listing_number,title,moderation_status")
    .eq("id", listingId)
    .maybeSingle();

  if (fetchErr || !listing || typeof listing !== "object") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const row = listing as {
    user_id: string | null;
    listing_number: number | string | null;
    moderation_status?: string | null;
  };

  if (String(row.moderation_status ?? "").toLowerCase() === "suspended") {
    return NextResponse.json(
      { ok: false, error: "already_suspended" },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { error: updErr } = await adminClient
    .from("listings")
    .update({
      moderation_status: "suspended",
      suspension_reason: reason,
      suspended_at: now,
    })
    .eq("id", listingId);

  if (updErr) {
    console.warn("suspend listing:", updErr.message);
    return NextResponse.json(
      { ok: false, error: "update_failed", message: updErr.message },
      { status: 500 }
    );
  }

  const ownerId = row.user_id;
  if (ownerId) {
    const num = row.listing_number != null ? String(row.listing_number) : "";
    const { error: notifErr } = await adminClient.from("user_notifications").insert({
      user_id: ownerId,
      type: "listing_suspended",
      title: "İlanınız askıya alındı",
      body:
        num !== ""
          ? `İlan no #${num} yayından kaldırıldı. Sebep: ${reason}`
          : `İlanınız yayından kaldırıldı. Sebep: ${reason}`,
      listing_id: listingId,
    });
    if (notifErr) {
      console.warn("user_notifications insert:", notifErr.message);
    }
  }

  return NextResponse.json({ ok: true });
}
