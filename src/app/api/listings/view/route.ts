import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { incrementListingView } from "@/lib/increment-listing-view";
import { fetchListingPublicStatsMap } from "@/lib/listing-stats";

/** Detay sayfası her açıldığında çağrılır; her çağrı +1 hedefler. */
export async function POST(req: Request) {
  let listingId: string | null = null;
  try {
    const body = (await req.json()) as { listingId?: unknown };
    listingId =
      typeof body.listingId === "string" && body.listingId.trim() !== ""
        ? body.listingId.trim()
        : null;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (!listingId) {
    return NextResponse.json({ ok: false, error: "listingId" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ok = await incrementListingView(
    supabase,
    listingId,
    user?.id ?? null
  );
  const stats = await fetchListingPublicStatsMap(supabase, [listingId]);
  const current = stats.get(listingId);
  return NextResponse.json({
    ok,
    views: current?.views,
    favorites: current?.favorites,
  });
}
