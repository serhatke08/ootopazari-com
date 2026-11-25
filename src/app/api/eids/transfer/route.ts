import { NextResponse } from "next/server";
import { transferEidsKullaniciToProfile } from "@/lib/eids-bind";
import { resolveRequestUser } from "@/lib/supabase/request-user";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const TRANSFER_WINDOW_MS = 20 * 60 * 1000;

/**
 * e-Devlet az önce bu oturumda kanıtlandı ama kod başka hesaptaydı.
 * Eski bağ koparılır, bu hesaba taşınır.
 * Body: { state }
 */
export async function POST(req: Request) {
  const { user } = await resolveRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { state?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const state = typeof body.state === "string" ? body.state.trim() : "";
  if (!state) {
    return NextResponse.json({ error: "missing_state" }, { status: 400 });
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "server_config" }, { status: 500 });
  }

  const { data: sessionRow, error } = await admin
    .from("eids_verification_sessions")
    .select(
      "id,state,user_id,listing_id,status,durum,kullanici_kodu,kullanici_ad,kullanici_soyad,kullanici_hata,created_at,consumed_at,expires_at"
    )
    .eq("state", state)
    .maybeSingle();

  if (error || !sessionRow) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  const session = sessionRow as {
    id: string;
    user_id: string;
    listing_id: string | null;
    status: string;
    durum: string | null;
    kullanici_kodu: string | null;
    kullanici_ad: string | null;
    kullanici_soyad: string | null;
    kullanici_hata: string | null;
    created_at: string;
    consumed_at: string | null;
    expires_at: string;
  };

  if (session.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const linked =
    session.kullanici_hata === "eids_already_linked" ||
    session.durum === "eids_already_linked";
  const kod = (session.kullanici_kodu ?? "").trim();
  if (!linked || !kod) {
    return NextResponse.json(
      { error: "not_transferable", message: "Bu oturumda taşınacak e-Devlet yok." },
      { status: 409 }
    );
  }

  const t = new Date(session.consumed_at || session.created_at).getTime();
  if (Number.isNaN(t) || Date.now() - t > TRANSFER_WINDOW_MS) {
    return NextResponse.json(
      {
        error: "session_expired",
        message: "Taşıma süresi doldu. e-Devlet’i yeniden başlatın.",
      },
      { status: 410 }
    );
  }

  const bound = await transferEidsKullaniciToProfile(admin, {
    userId: user.id,
    kullaniciKodu: kod,
    ad: session.kullanici_ad,
    soyad: session.kullanici_soyad,
  });

  if (!bound.ok) {
    return NextResponse.json(
      { error: bound.error, message: bound.message },
      { status: 409 }
    );
  }

  await admin
    .from("eids_verification_sessions")
    .update({
      status: "completed",
      durum: "ok",
      kullanici_hata: null,
    })
    .eq("id", session.id);

  return NextResponse.json({
    ok: true,
    alreadyBound: bound.alreadyBound,
    listingId: session.listing_id,
  });
}
