import { NextResponse } from "next/server";
import {
  isListingReportReason,
  LISTING_REPORT_REASONS,
  LISTING_REPORT_STATUS_PENDING,
} from "@/lib/listing-reports";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "Şikayet için giriş yapmalısınız." },
      { status: 401 }
    );
  }

  let body: { listingId?: unknown; reason?: unknown; detail?: unknown };
  try {
    body = (await req.json()) as {
      listingId?: unknown;
      reason?: unknown;
      detail?: unknown;
    };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const listingId =
    typeof body.listingId === "string" && body.listingId.trim() !== ""
      ? body.listingId.trim()
      : null;
  const reason =
    typeof body.reason === "string" ? body.reason.trim() : "";
  const detail =
    typeof body.detail === "string" ? body.detail.trim() : "";

  if (!listingId) {
    return NextResponse.json({ ok: false, error: "listingId" }, { status: 400 });
  }

  if (!isListingReportReason(reason)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_reason",
        message: "Geçersiz şikayet konusu.",
        allowed: LISTING_REPORT_REASONS,
      },
      { status: 400 }
    );
  }

  if (reason === "Diğer" && detail.length < 10) {
    return NextResponse.json(
      {
        ok: false,
        error: "detail_required",
        message: "«Diğer» için en az 10 karakter açıklama girin.",
      },
      { status: 400 }
    );
  }

  if (detail.length > 2000) {
    return NextResponse.json(
      { ok: false, error: "detail_too_long", message: "Açıklama en fazla 2000 karakter." },
      { status: 400 }
    );
  }

  const { data: listing, error: listingErr } = await supabase
    .from("listings")
    .select("id,user_id,moderation_status")
    .eq("id", listingId)
    .maybeSingle();

  if (listingErr || !listing || typeof listing !== "object") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const row = listing as {
    user_id?: string | null;
    moderation_status?: string | null;
  };

  if (String(row.moderation_status ?? "").toLowerCase() !== "approved") {
    return NextResponse.json(
      { ok: false, error: "not_reportable", message: "Bu ilan şikayet edilemez." },
      { status: 400 }
    );
  }

  if (row.user_id && String(row.user_id) === user.id) {
    return NextResponse.json(
      { ok: false, error: "own_listing", message: "Kendi ilanınızı şikayet edemezsiniz." },
      { status: 400 }
    );
  }

  const { error: insErr } = await supabase.from("listing_reports").insert({
    listing_id: listingId,
    reporter_id: user.id,
    reason,
    detail: detail || null,
    status: LISTING_REPORT_STATUS_PENDING,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json(
        {
          ok: false,
          error: "already_reported",
          message: "Bu ilanı zaten şikayet ettiniz.",
        },
        { status: 409 }
      );
    }
    console.warn("listing_reports insert:", insErr.message);
    return NextResponse.json(
      { ok: false, error: "insert_failed", message: insErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
