import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
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
  const quotaClient = createSupabaseServiceClient() ?? supabase;
  const quota = await fetchListingQuota(quotaClient, user.id);
  return NextResponse.json({ ok: true, ...quota });
}
