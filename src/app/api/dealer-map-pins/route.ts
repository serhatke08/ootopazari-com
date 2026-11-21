import { NextResponse } from "next/server";
import { tryGetSupabaseEnv } from "@/lib/env";
import { signBayiPhotoUrl } from "@/lib/bayi-photos";
import {
  firstMapPinCoverPath,
  firstMapPinPhotoPath,
  toDealerMapPin,
  type DealerMapPin,
} from "@/lib/dealer-map-pins";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = tryGetSupabaseEnv();
  if (!env) {
    return NextResponse.json({ error: "missing_env" }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const signer = createSupabaseServiceClient() ?? supabase;
  const { data, error } = await supabase.rpc("list_dealer_map_pins");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!Array.isArray(data)) {
    return NextResponse.json([]);
  }

  const pins: DealerMapPin[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const pin = toDealerMapPin(row as Record<string, unknown>);
    if (pin) pins.push(pin);
  }

  const withMedia = await Promise.all(
    pins.map(async (pin) => {
      const logoPath = firstMapPinPhotoPath(pin);
      const coverPath = firstMapPinCoverPath(pin);
      const [logoUrl, coverUrl] = await Promise.all([
        logoPath ? signBayiPhotoUrl(signer, logoPath) : Promise.resolve(null),
        coverPath ? signBayiPhotoUrl(signer, coverPath) : Promise.resolve(null),
      ]);
      return { ...pin, logoUrl, coverUrl };
    })
  );

  return NextResponse.json(withMedia);
}
