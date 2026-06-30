import { NextResponse } from "next/server";
import { tryGetSupabaseEnv } from "@/lib/env";
import { fetchListingByNumber } from "@/lib/listings-data";
import { buildListingSeoPath } from "@/lib/listing-seo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return NextResponse.json({ ok: false, error: "missing_env" }, { status: 503 });
  }

  const no = new URL(req.url).searchParams.get("no")?.trim() ?? "";
  if (!/^\d{6,14}$/.test(no)) {
    return NextResponse.json({ ok: false, error: "invalid_number" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const listing = await fetchListingByNumber(supabase, no);
    if (!listing) {
      return NextResponse.json({ ok: false });
    }

    const path = buildListingSeoPath(
      listing.listing_number != null ? String(listing.listing_number) : no,
      typeof listing.title === "string" ? listing.title : null
    );

    return NextResponse.json({
      ok: true,
      path,
      listingNumber: String(listing.listing_number ?? no),
      title: listing.title ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "lookup_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
