import { NextResponse } from "next/server";
import { fetchUserPaymentHistory } from "@/lib/payment-history";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Giriş yapmalısınız." },
      { status: 401 }
    );
  }

  const entries = await fetchUserPaymentHistory(supabase, user.id, 80);

  return NextResponse.json({ ok: true, entries });
}
