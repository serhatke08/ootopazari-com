import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDealerApplication } from "@/lib/bayi-data";
import type { DealerType } from "@/lib/bayi-types";
import { DEALER_TYPES } from "@/lib/bayi-types";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Giriş yapmalısınız" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      dealer_type,
      first_name,
      last_name,
      contact_phone,
      dealer_name,
      city_id,
      monthly_fee_amount,
    } = body;

    // Validation
    if (!dealer_type || !DEALER_TYPES.includes(dealer_type as DealerType)) {
      return NextResponse.json(
        { error: "Geçersiz bayi tipi" },
        { status: 400 }
      );
    }

    if (!first_name || !last_name || !contact_phone || !dealer_name || !city_id) {
      return NextResponse.json(
        { error: "Tüm alanları doldurun" },
        { status: 400 }
      );
    }

    // Check for existing application
    const { data: existing } = await supabase
      .from("bayi_applications")
      .select("id")
      .eq("user_id", user.id)
      .eq("dealer_type", dealer_type)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Bu bayi tipi için zaten başvurunuz var" },
        { status: 400 }
      );
    }

    // Create application
    const application = await createDealerApplication(supabase, user.id, {
      dealer_type: dealer_type as DealerType,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      contact_phone: contact_phone.trim(),
      dealer_name: dealer_name.trim(),
      city_id: city_id.trim(),
      monthly_fee_amount: Number(monthly_fee_amount) || 0,
    });

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error("Bayi application error:", error);
    return NextResponse.json(
      { error: "Başvuru gönderilemedi" },
      { status: 500 }
    );
  }
}
