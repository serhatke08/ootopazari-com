import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEALER_TYPE_VALUES, type DealerType } from "@/lib/dealer-types";

function isDealerType(value: string): value is DealerType {
  return (DEALER_TYPE_VALUES as readonly string[]).includes(value);
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: {
    dealerType?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    contactPhone?: unknown;
    idPhotoStoragePath?: unknown;
    selfieStoragePath?: unknown;
    dealerName?: unknown;
    taxDocumentStoragePath?: unknown;
    businessAddress?: unknown;
    cityId?: unknown;
    workplacePhotosJson?: unknown;
    signboardPhotoStoragePath?: unknown;
    description?: unknown;
  };
  try {
    payload = (await req.json()) as { dealerType?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const dealerTypeRaw =
    typeof payload.dealerType === "string"
      ? payload.dealerType.trim().toLocaleLowerCase("tr")
      : "";

  if (!isDealerType(dealerTypeRaw)) {
    return NextResponse.json(
      { ok: false, error: "dealer_type_invalid" },
      { status: 400 }
    );
  }

  const firstName =
    typeof payload.firstName === "string" ? payload.firstName.trim() : "";
  const lastName =
    typeof payload.lastName === "string" ? payload.lastName.trim() : "";
  const contactPhone =
    typeof payload.contactPhone === "string" ? payload.contactPhone.trim() : "";
  const idPhotoStoragePath =
    typeof payload.idPhotoStoragePath === "string"
      ? payload.idPhotoStoragePath.trim()
      : "";
  const selfieStoragePath =
    typeof payload.selfieStoragePath === "string"
      ? payload.selfieStoragePath.trim()
      : "";
  const dealerName =
    typeof payload.dealerName === "string" ? payload.dealerName.trim() : "";
  const taxDocumentStoragePath =
    typeof payload.taxDocumentStoragePath === "string"
      ? payload.taxDocumentStoragePath.trim()
      : "";
  const businessAddress =
    typeof payload.businessAddress === "string"
      ? payload.businessAddress.trim()
      : "";
  const cityId = typeof payload.cityId === "string" ? payload.cityId.trim() : "";
  const description =
    typeof payload.description === "string" ? payload.description.trim() : "";
  const signboardPhotoStoragePath =
    typeof payload.signboardPhotoStoragePath === "string"
      ? payload.signboardPhotoStoragePath.trim()
      : "";
  const workplacePhotosJson = Array.isArray(payload.workplacePhotosJson)
    ? payload.workplacePhotosJson
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
    : [];

  if (
    !firstName ||
    !lastName ||
    !contactPhone ||
    !idPhotoStoragePath ||
    !selfieStoragePath ||
    !dealerName ||
    !taxDocumentStoragePath ||
    !businessAddress ||
    !cityId
  ) {
    return NextResponse.json(
      { ok: false, error: "required_fields_missing" },
      { status: 400 }
    );
  }

  // Aynı kullanıcı + tür için bekleyen başvuru varsa tekrar açma.
  const { data: existing } = await supabase
    .from("bayi_applications")
    .select("id")
    .eq("user_id", user.id)
    .eq("dealer_type", dealerTypeRaw)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({ ok: true, alreadyPending: true });
  }

  const { error } = await supabase.from("bayi_applications").insert({
    user_id: user.id,
    dealer_type: dealerTypeRaw,
    first_name: firstName,
    last_name: lastName,
    contact_phone: contactPhone,
    id_photo_storage_path: idPhotoStoragePath,
    selfie_storage_path: selfieStoragePath,
    dealer_name: dealerName,
    tax_document_storage_path: taxDocumentStoragePath,
    business_address: businessAddress,
    city_id: cityId,
    workplace_photos_json: workplacePhotosJson,
    signboard_photo_storage_path: signboardPhotoStoragePath || null,
    description: description || null,
    status: "pending",
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "insert_failed", message: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
