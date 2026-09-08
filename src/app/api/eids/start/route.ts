import { NextResponse } from "next/server";
import {
  createEidsState,
  EIDS_SESSION_TTL_MS,
  getEidsReturnUrl,
  isEidsSource,
  sanitizeEidsWebReturnPath,
} from "@/lib/eids";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * EİDS doğrulama oturumu başlatır (app + web).
 * Body: { listingId?: string, source: "app"|"web", webReturnPath?: string }
 * Dönüş: { state, returnUrl, expiresAt }
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    listingId?: unknown;
    source?: unknown;
    webReturnPath?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!isEidsSource(body.source)) {
    return NextResponse.json(
      { error: "invalid_source", message: "source app veya web olmalı." },
      { status: 400 }
    );
  }

  const listingId =
    typeof body.listingId === "string" && body.listingId.trim()
      ? body.listingId.trim()
      : null;
  const webReturnPath =
    body.source === "web"
      ? sanitizeEidsWebReturnPath(
          typeof body.webReturnPath === "string" ? body.webReturnPath : null
        )
      : null;

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }

  if (listingId) {
    const { data: listing, error: listingErr } = await admin
      .from("listings")
      .select("id,user_id")
      .eq("id", listingId)
      .maybeSingle();
    if (listingErr || !listing) {
      return NextResponse.json({ error: "listing_not_found" }, { status: 404 });
    }
    if (String((listing as { user_id?: string }).user_id) !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const state = createEidsState();
  const expiresAt = new Date(Date.now() + EIDS_SESSION_TTL_MS).toISOString();

  // Aynı kullanıcı için eski pending oturumları geçersiz kıl (tek aktif akış).
  await admin
    .from("eids_verification_sessions")
    .update({ status: "expired", consumed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "pending");

  const { data: inserted, error: insertErr } = await admin
    .from("eids_verification_sessions")
    .insert({
      state,
      user_id: user.id,
      listing_id: listingId,
      source: body.source,
      web_return_path: webReturnPath,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id,state,expires_at")
    .single();

  if (insertErr || !inserted) {
    console.warn("eids start insert:", insertErr?.message);
    return NextResponse.json(
      { error: "session_create_failed", message: insertErr?.message },
      { status: 500 }
    );
  }

  const returnUrl = getEidsReturnUrl();

  return NextResponse.json({
    ok: true,
    state: inserted.state as string,
    returnUrl,
    /** EİDS’e giderken Return URL’ye state eklemek mümkünse kullanın. */
    returnUrlWithState: `${returnUrl}?state=${encodeURIComponent(String(inserted.state))}`,
    expiresAt: inserted.expires_at as string,
    sessionId: inserted.id as string,
  });
}
