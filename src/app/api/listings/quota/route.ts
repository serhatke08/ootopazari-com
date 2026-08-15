import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { expireDueListings, fetchListingQuota } from "@/lib/listing-quota";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  await expireDueListings(supabase, { userId: user.id });
  const quota = await fetchListingQuota(supabase, user.id);
  return NextResponse.json({ ok: true, ...quota });
}
