import { NextResponse } from "next/server";
import { isPriceRatingValue } from "@/lib/listing-price-ratings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error: "unauthorized",
        message: "Oy vermek için giriş yapmalısınız.",
      },
      { status: 401 }
    );
  }

  let body: { listingId?: unknown; rating?: unknown };
  try {
    body = (await req.json()) as { listingId?: unknown; rating?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const listingId =
    typeof body.listingId === "string" && body.listingId.trim() !== ""
      ? body.listingId.trim()
      : null;
  const rating = body.rating;

  if (!listingId) {
    return NextResponse.json({ ok: false, error: "listingId" }, { status: 400 });
  }

  if (!isPriceRatingValue(rating)) {
    return NextResponse.json(
      { ok: false, error: "invalid_rating", message: "Geçersiz oy." },
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
      { ok: false, error: "not_rateable", message: "Bu ilan oylanamaz." },
      { status: 400 }
    );
  }

  if (row.user_id && String(row.user_id) === user.id) {
    return NextResponse.json(
      {
        ok: false,
        error: "own_listing",
        message: "Kendi ilanınıza oy veremezsiniz.",
      },
      { status: 400 }
    );
  }

  const { error: upsertErr } = await supabase.from("listing_price_ratings").upsert(
    {
      listing_id: listingId,
      user_id: user.id,
      rating,
    },
    { onConflict: "listing_id,user_id" }
  );

  if (upsertErr) {
    console.warn("listing_price_ratings upsert:", upsertErr.message);
    return NextResponse.json(
      { ok: false, error: "insert_failed", message: upsertErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
