import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDealerApplication } from "@/lib/bayi-data";
import type { DealerType } from "@/lib/bayi-types";
import { DEALER_SETUP_FEE_TRY, DEALER_TYPES } from "@/lib/bayi-types";
import { normalizeDealerState } from "@/lib/bayi-application-status";

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
      monthly_fee_amount: Number(monthly_fee_amount) || DEALER_SETUP_FEE_TRY,
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

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const dealerType =
      typeof body.dealer_type === "string" ? body.dealer_type.trim() : "";
    if (!DEALER_TYPES.includes(dealerType as DealerType)) {
      return NextResponse.json({ error: "Geçersiz bayi tipi" }, { status: 400 });
    }

    const { data: application, error: fetchErr } = await supabase
      .from("bayi_applications")
      .select("id,status,payment_status,membership_expires_at")
      .eq("user_id", user.id)
      .eq("dealer_type", dealerType)
      .maybeSingle();

    if (fetchErr || !application) {
      return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 });
    }

    const state = normalizeDealerState(
      application.status as "pending" | "approved" | "rejected",
      application.payment_status as
        | "unpaid"
        | "awaiting_payment"
        | "paid"
        | "overdue",
      application.membership_expires_at as string | null
    );
    if (state !== "active") {
      return NextResponse.json(
        { error: "Mağaza bilgisi ancak 500 TL açılış ödemesinden sonra düzenlenir." },
        { status: 403 }
      );
    }

    const str = (key: string) =>
      typeof body[key] === "string" ? String(body[key]).trim() : "";

    const dealerName = str("dealer_name");
    const contactPhone = str("contact_phone");
    const cityId = str("city_id");
    if (!dealerName || !contactPhone || !cityId) {
      return NextResponse.json(
        { error: "Bayi adı, telefon ve şehir zorunlu" },
        { status: 400 }
      );
    }

    const core = {
      dealer_name: dealerName,
      contact_phone: contactPhone,
      description: str("description"),
      city_id: cityId,
    };
    const extras = {
      working_hours: str("working_hours"),
      authorized_brands: str("authorized_brands"),
      whatsapp_phone: str("whatsapp_phone"),
      full_address: str("full_address"),
    };

    const fullUpd = await supabase
      .from("bayi_applications")
      .update({ ...core, ...extras })
      .eq("id", application.id)
      .eq("user_id", user.id);

    if (fullUpd.error) {
      const coreUpd = await supabase
        .from("bayi_applications")
        .update(core)
        .eq("id", application.id)
        .eq("user_id", user.id);
      if (coreUpd.error) {
        return NextResponse.json({ error: coreUpd.error.message }, { status: 400 });
      }
      const extrasRpc = await supabase.rpc("update_own_dealer_store_extras", {
        p_application_id: application.id,
        p_working_hours: extras.working_hours,
        p_authorized_brands: extras.authorized_brands,
        p_whatsapp_phone: extras.whatsapp_phone,
      });
      if (extrasRpc.error) {
        return NextResponse.json(
          { error: extrasRpc.error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bayi application patch:", error);
    return NextResponse.json({ error: "Kaydedilemedi" }, { status: 500 });
  }
}
